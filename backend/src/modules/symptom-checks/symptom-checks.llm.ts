/**
 * Symptom checker — LLM call layer.
 *
 * Phase 2: single-pass triage.
 * Phase 3: optional one-round clarification — the LLM may return either a
 *          triage decision or a small set of clarifying question IDs.
 *
 * One job: take a symptom description and return a validated LlmOutput,
 * or null on any failure. The caller (service) treats null as "fall back to
 * deterministic ROUTINE + General Physician" — so the LLM is never load-bearing
 * for safety.
 *
 * The function never throws on expected failure paths (timeout, network,
 * invalid JSON, schema mismatch). It returns `output: null` instead.
 */

import Anthropic from '@anthropic-ai/sdk';
import { config } from '../../config';
import {
    llmOutputSchema,
    llmContinuationOutputSchema,
    type LlmOutput,
} from './symptom-checks.schemas';
import {
    buildInitialSystemPrompt,
    buildContinuationSystemPrompt,
    buildTriageUserMessage,
    PROMPT_VERSION,
} from './symptom-checks.prompt';

// ─── Types ───────────────────────────────────────────────────────────────────

export type TriageLlmMode = 'initial' | 'continuation';

export interface TriageLlmInput {
    symptomsText: string;
    ageBand?: string | null;
    sex?: string | null;
    /** Canonical specialty names from the Specialization table at call time. */
    specializationNames: readonly string[];
    /** 'initial' allows clarify branch; 'continuation' forbids it. Default 'initial'. */
    mode?: TriageLlmMode;
}

export interface TriageLlmCallResult {
    /** Validated structured output, or null when the call failed / was disabled. */
    output: LlmOutput | null;
    /** Raw text the model returned, encrypted before persistence. */
    rawResponse: string | null;
    /** Model id we used. */
    modelVersion: string;
    /** Prompt revision. */
    promptVersion: string;
    /** Reason for failure when output is null — for telemetry. */
    failureReason?: 'DISABLED' | 'TIMEOUT' | 'API_ERROR' | 'PARSE_ERROR' | 'SCHEMA_ERROR';
}

// ─── Client (singleton, lazily initialised) ──────────────────────────────────

let _client: Anthropic | null = null;

function getClient(): Anthropic | null {
    const key = config.symptomChecker.llm.anthropicApiKey;
    if (!key) return null;
    if (!_client) {
        _client = new Anthropic({
            apiKey: key,
            timeout: config.symptomChecker.llm.timeoutMs,
            maxRetries: config.symptomChecker.llm.maxRetries,
        });
    }
    return _client;
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Make a triage call. `mode` controls whether the LLM may return a clarify
 * branch (initial) or must commit to triage (continuation).
 */
export async function callTriageLLM(input: TriageLlmInput): Promise<TriageLlmCallResult> {
    const modelVersion = config.symptomChecker.llm.model;
    const promptVersion = PROMPT_VERSION;
    const mode: TriageLlmMode = input.mode ?? 'initial';

    const client = getClient();
    if (!client) {
        return {
            output: null,
            rawResponse: null,
            modelVersion,
            promptVersion,
            failureReason: 'DISABLED',
        };
    }

    const system =
        mode === 'continuation'
            ? buildContinuationSystemPrompt(input.specializationNames)
            : buildInitialSystemPrompt(input.specializationNames);

    const userMessage = buildTriageUserMessage({
        symptomsText: input.symptomsText,
        ageBand: input.ageBand,
        sex: input.sex,
    });

    let rawText: string | null = null;
    try {
        const response = await client.messages.create({
            model: modelVersion,
            max_tokens: config.symptomChecker.llm.maxOutputTokens,
            system,
            messages: [{ role: 'user', content: userMessage }],
        });
        rawText = response.content
            .filter((block) => block.type === 'text')
            .map((block) => (block as { type: 'text'; text: string }).text)
            .join('')
            .trim();
    } catch (err) {
        const isTimeout = err instanceof Error && /timeout|abort/i.test(err.message);
        console.error('[symptom-checks] LLM API error', err);
        return {
            output: null,
            rawResponse: null,
            modelVersion,
            promptVersion,
            failureReason: isTimeout ? 'TIMEOUT' : 'API_ERROR',
        };
    }

    if (!rawText) {
        return {
            output: null,
            rawResponse: null,
            modelVersion,
            promptVersion,
            failureReason: 'API_ERROR',
        };
    }

    const cleaned = stripCodeFence(rawText);

    let parsed: unknown;
    try {
        parsed = JSON.parse(cleaned);
    } catch {
        return {
            output: null,
            rawResponse: rawText,
            modelVersion,
            promptVersion,
            failureReason: 'PARSE_ERROR',
        };
    }

    // Continuation calls reject the clarify branch outright.
    const schema = mode === 'continuation' ? llmContinuationOutputSchema : llmOutputSchema;
    const validated = schema.safeParse(parsed);
    if (!validated.success) {
        return {
            output: null,
            rawResponse: rawText,
            modelVersion,
            promptVersion,
            failureReason: 'SCHEMA_ERROR',
        };
    }

    return {
        output: validated.data,
        rawResponse: rawText,
        modelVersion,
        promptVersion,
    };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function stripCodeFence(text: string): string {
    const trimmed = text.trim();
    if (trimmed.startsWith('```')) {
        return trimmed
            .replace(/^```(?:json)?\s*/i, '')
            .replace(/\s*```$/, '')
            .trim();
    }
    return trimmed;
}
