import type { Metadata } from 'next';
import Link from 'next/link';
import {
    LegalDocumentShell,
    LegalSection,
    LegalP,
    LegalUl,
} from '@/components/legal/LegalDocumentShell';

export const metadata: Metadata = {
    title: 'Terms & Conditions | BacancyTeleCare',
    description:
        'Terms governing use of the BacancyTeleCare telemedicine platform, including eligibility, telehealth disclaimers, and acceptable use.',
};

const LAST_UPDATED = 'May 6, 2026';

export default function TermsAndConditionsPage() {
    return (
        <LegalDocumentShell title="Terms & Conditions" lastUpdated={LAST_UPDATED}>
            <LegalSection id="agreement" title="1. Agreement to these terms">
                <LegalP>
                    These Terms &amp; Conditions (&quot;Terms&quot;) govern your access to and use
                    of the websites, applications, and related services offered by BacancyTeleCare
                    Inc. (&quot;BacancyTeleCare,&quot; &quot;we,&quot; &quot;us,&quot; or
                    &quot;our&quot;) (collectively, the &quot;Services&quot;). By creating an
                    account, using the Services, or clicking to accept these Terms where presented,
                    you agree to be bound by these Terms and our{' '}
                    <Link
                        href="/privacy"
                        className="font-semibold text-medical-teal hover:underline"
                    >
                        Privacy Policy
                    </Link>
                    .
                </LegalP>
                <LegalP>
                    If you do not agree, do not use the Services. We may refuse service to anyone at
                    any time, subject to applicable law.
                </LegalP>
            </LegalSection>

            <LegalSection id="eligibility" title="2. Eligibility and accounts">
                <LegalP>
                    You must be at least 18 years old (or the age of majority in your jurisdiction)
                    to create a patient account, unless a parent or legal guardian registers on
                    behalf of a minor in compliance with our policies and applicable law. You agree
                    to provide accurate, current information and to keep your account credentials
                    confidential. You are responsible for all activity under your account.
                </LegalP>
            </LegalSection>

            <LegalSection id="nature-of-service" title="3. Nature of the Services">
                <LegalP>
                    BacancyTeleCare provides technology that facilitates virtual care, scheduling,
                    messaging, health record access, and related features. BacancyTeleCare is not a
                    healthcare provider and does not practice medicine or any other licensed
                    profession. Any diagnosis, treatment, prescription, or clinical decision is the
                    responsibility of the independent licensed professionals who use our platform.
                </LegalP>
                <LegalP>
                    THE SERVICES ARE NOT A SUBSTITUTE FOR EMERGENCY OR IN-PERSON CARE. IF YOU
                    BELIEVE YOU ARE EXPERIENCING A MEDICAL EMERGENCY, CALL YOUR LOCAL EMERGENCY
                    NUMBER (SUCH AS 911 IN THE UNITED STATES) OR GO TO THE NEAREST EMERGENCY ROOM
                    IMMEDIATELY. DO NOT RELY ON THE SERVICES FOR TIME-SENSITIVE OR LIFE-THREATENING
                    CONDITIONS.
                </LegalP>
            </LegalSection>

            <LegalSection id="telehealth-consent" title="4. Informed consent for telehealth">
                <LegalP>
                    Telehealth involves the use of electronic communications to enable providers to
                    evaluate, diagnose, consult, or treat you remotely. You understand that virtual
                    visits have limitations compared to in-person exams (for example, physical
                    examination may be limited), and that your provider may determine that an
                    in-person visit is necessary.
                </LegalP>
                <LegalP>
                    You agree to share relevant health information truthfully and to follow your
                    provider&apos;s instructions. Technical failures may occasionally interrupt a
                    visit; you agree to cooperate in rescheduling if that occurs.
                </LegalP>
            </LegalSection>

            <LegalSection id="payments" title="5. Fees and payment">
                <LegalP>
                    Certain features may be free; others may require payment, insurance billing, or
                    both. You agree to pay all fees associated with services you purchase or book,
                    plus applicable taxes, according to the pricing and billing terms presented at
                    checkout or in a separate agreement. Late or failed payments may result in
                    suspension of access. Refund policies, if any, will be stated at the point of
                    purchase or in provider-specific policies.
                </LegalP>
            </LegalSection>

            <LegalSection id="acceptable-use" title="6. Acceptable use">
                <LegalP>You agree not to:</LegalP>
                <LegalUl>
                    <li>
                        Use the Services for any unlawful purpose or in violation of these Terms.
                    </li>
                    <li>
                        Attempt to probe, scan, or test the vulnerability of the Services, or breach
                        security or authentication measures.
                    </li>
                    <li>
                        Interfere with other users&apos; use of the Services, including through
                        malware, denial-of-service attacks, or spam.
                    </li>
                    <li>
                        Misrepresent your identity, impersonate another person, or access another
                        user&apos;s account without authorization.
                    </li>
                    <li>
                        Scraping, automated data collection, or reverse engineering except as
                        permitted by applicable law and our robots.txt or written permission.
                    </li>
                    <li>
                        Use the Services to distribute objectionable, harassing, or discriminatory
                        content, or content that violates patient confidentiality.
                    </li>
                </LegalUl>
            </LegalSection>

            <LegalSection id="intellectual-property" title="7. Intellectual property">
                <LegalP>
                    The Services, including software, branding, text, graphics, and compilations,
                    are owned by BacancyTeleCare or its licensors and are protected by intellectual
                    property laws. Subject to these Terms, we grant you a limited, non-exclusive,
                    non-transferable, revocable license to access and use the Services for personal,
                    non-commercial purposes (or internal business use if you are a provider
                    organization with a separate agreement). Except as expressly permitted, you may
                    not copy, modify, distribute, sell, or lease any part of the Services.
                </LegalP>
            </LegalSection>

            <LegalSection id="user-content" title="8. User content">
                <LegalP>
                    You may submit messages, files, or other materials through the Services
                    (&quot;User Content&quot;). You retain ownership of your User Content, but grant
                    BacancyTeleCare a worldwide, royalty-free license to host, use, reproduce, and
                    display User Content solely as needed to operate, secure, and improve the
                    Services and comply with law. You represent that you have the rights to grant
                    this license and that your User Content does not violate third-party rights or
                    law.
                </LegalP>
            </LegalSection>

            <LegalSection id="third-parties" title="9. Third-party services">
                <LegalP>
                    The Services may link to or integrate with third-party websites, pharmacies,
                    labs, imaging centers, or payment processors. Those third parties have their own
                    terms and privacy policies. BacancyTeleCare is not responsible for third-party
                    content or practices.
                </LegalP>
            </LegalSection>

            <LegalSection id="disclaimers" title="10. Disclaimers">
                <LegalP>
                    THE SERVICES ARE PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE,&quot;
                    WITHOUT WARRANTIES OF ANY KIND, WHETHER EXPRESS, IMPLIED, OR STATUTORY,
                    INCLUDING IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR
                    PURPOSE, TITLE, AND NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE SERVICES WILL
                    BE UNINTERRUPTED, ERROR-FREE, OR FREE OF HARMFUL COMPONENTS.
                </LegalP>
            </LegalSection>

            <LegalSection id="limitation-of-liability" title="11. Limitation of liability">
                <LegalP>
                    TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, BACANCYTECARE AND ITS
                    OFFICERS, DIRECTORS, EMPLOYEES, AND AGENTS WILL NOT BE LIABLE FOR ANY INDIRECT,
                    INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS,
                    DATA, GOODWILL, OR OTHER INTANGIBLE LOSSES, ARISING OUT OF OR RELATED TO YOUR
                    USE OF THE SERVICES, EVEN IF WE HAVE BEEN ADVISED OF THE POSSIBILITY OF SUCH
                    DAMAGES.
                </LegalP>
                <LegalP>
                    OUR TOTAL AGGREGATE LIABILITY FOR ANY CLAIMS ARISING OUT OF OR RELATING TO THE
                    SERVICES OR THESE TERMS WILL NOT EXCEED THE GREATER OF (A) THE AMOUNTS YOU PAID
                    TO BACANCYTECARE FOR THE SERVICES GIVING RISE TO THE CLAIM DURING THE SIX (6)
                    MONTHS BEFORE THE CLAIM, OR (B) ONE HUNDRED U.S. DOLLARS ($100), EXCEPT WHERE
                    PROHIBITED BY LAW. SOME JURISDICTIONS DO NOT ALLOW CERTAIN LIMITATIONS; IN THOSE
                    CASES, OUR LIABILITY WILL BE LIMITED TO THE FULLEST EXTENT PERMITTED BY LAW.
                </LegalP>
            </LegalSection>

            <LegalSection id="indemnity" title="12. Indemnity">
                <LegalP>
                    You will defend, indemnify, and hold harmless BacancyTeleCare from any claims,
                    liabilities, damages, losses, and expenses (including reasonable attorneys&apos;
                    fees) arising out of your User Content, your use of the Services, your violation
                    of these Terms, or your violation of any law or third-party rights.
                </LegalP>
            </LegalSection>

            <LegalSection id="termination" title="13. Term and termination">
                <LegalP>
                    These Terms remain in effect while you use the Services. You may stop using the
                    Services at any time. We may suspend or terminate your access for conduct that
                    we believe violates these Terms, creates risk, or for operational or legal
                    reasons, with or without notice where permitted by law. Provisions that by their
                    nature should survive (including intellectual property, disclaimers, limitations
                    of liability, indemnity, and governing law) will survive termination.
                </LegalP>
            </LegalSection>

            <LegalSection id="governing-law" title="14. Governing law and disputes">
                <LegalP>
                    These Terms are governed by the laws of the State of Delaware, without regard to
                    conflict-of-law rules, unless a different governing law is required by your
                    jurisdiction. You agree that exclusive jurisdiction for disputes will lie in the
                    state or federal courts located in Delaware, unless applicable law requires
                    otherwise. You waive any right to participate in a class action or jury trial
                    where such waiver is enforceable.
                </LegalP>
            </LegalSection>

            <LegalSection id="changes" title="15. Changes to the Terms">
                <LegalP>
                    We may modify these Terms from time to time. We will post the updated Terms on
                    this page and update the &quot;Last updated&quot; date. If changes are material,
                    we will provide additional notice as required by law. Continued use after the
                    effective date constitutes acceptance of the revised Terms.
                </LegalP>
            </LegalSection>

            <LegalSection id="contact" title="16. Contact">
                <LegalP>For questions about these Terms, contact:</LegalP>
                <LegalP>
                    <strong className="text-slate-800">BacancyTeleCare Inc.</strong>
                    <br />
                    Legal &amp; Compliance
                    <br />
                    Email: legal@bacancytelecare.com
                </LegalP>
            </LegalSection>
        </LegalDocumentShell>
    );
}
