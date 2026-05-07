import type { Metadata } from 'next';
import {
    LegalDocumentShell,
    LegalSection,
    LegalP,
    LegalUl,
} from '@/components/legal/LegalDocumentShell';

export const metadata: Metadata = {
    title: 'Privacy Policy | BacancyTeleCare',
    description:
        'How BacancyTeleCare collects, uses, and protects health and personal information for our telemedicine platform.',
};

const LAST_UPDATED = 'May 6, 2026';

export default function PrivacyPolicyPage() {
    return (
        <LegalDocumentShell title="Privacy Policy" lastUpdated={LAST_UPDATED}>
            <LegalSection id="introduction" title="1. Introduction">
                <LegalP>
                    BacancyTeleCare Inc. (&quot;BacancyTeleCare,&quot; &quot;we,&quot;
                    &quot;us,&quot; or &quot;our&quot;) operates a telehealth and virtual care
                    platform that connects patients with licensed healthcare providers. We are
                    committed to protecting your privacy and handling health and personal
                    information responsibly.
                </LegalP>
                <LegalP>
                    This Privacy Policy explains what information we collect, how we use and share
                    it, and the choices available to you. If you use our services, you agree to the
                    practices described here. This policy is designed to align with common
                    expectations for healthcare-related services in the United States, including
                    protections appropriate for individually identifiable health information.
                </LegalP>
            </LegalSection>

            <LegalSection id="information-we-collect" title="2. Information we collect">
                <LegalP>We may collect the following categories of information:</LegalP>
                <LegalUl>
                    <li>
                        <strong className="text-slate-800">Account and contact data:</strong> name,
                        email address, phone number, date of birth, mailing address, and login
                        credentials.
                    </li>
                    <li>
                        <strong className="text-slate-800">Health and clinical information:</strong>{' '}
                        symptoms, medical history, medications, allergies, visit notes, messages you
                        exchange through the platform, files you upload (for example, lab results or
                        imaging reports), and information recorded during telehealth visits.
                    </li>
                    <li>
                        <strong className="text-slate-800">Scheduling and billing:</strong>{' '}
                        appointment details, insurance or payment information (processed in
                        accordance with PCI and partner requirements), and related transaction
                        records.
                    </li>
                    <li>
                        <strong className="text-slate-800">Technical and usage data:</strong> IP
                        address, device type, browser type, approximate location derived from IP,
                        cookies and similar technologies, log data, and how you interact with our
                        website and applications.
                    </li>
                    <li>
                        <strong className="text-slate-800">Communications:</strong> content of
                        support requests, feedback surveys, and other correspondence with us.
                    </li>
                </LegalUl>
                <LegalP>
                    We may receive information about you from healthcare providers who use our
                    platform, payors, pharmacies (for e-prescribing where applicable), and
                    integrated services you or your provider authorize.
                </LegalP>
            </LegalSection>

            <LegalSection id="how-we-use" title="3. How we use information">
                <LegalP>We use collected information to:</LegalP>
                <LegalUl>
                    <li>Create and manage your account and authenticate access.</li>
                    <li>
                        Facilitate telehealth visits, messaging, scheduling, and care coordination
                        between you and providers.
                    </li>
                    <li>
                        Operate, maintain, secure, and improve our platform, including
                        troubleshooting and fraud prevention.
                    </li>
                    <li>
                        Send service-related notices (such as appointment reminders, security
                        alerts, and policy updates).
                    </li>
                    <li>
                        Comply with law, respond to lawful requests, and enforce our agreements.
                    </li>
                    <li>
                        Where permitted by law and your preferences, send educational or promotional
                        communications about our services (you may opt out of marketing as described
                        below).
                    </li>
                </LegalUl>
            </LegalSection>

            <LegalSection id="legal-bases-health" title="4. Health information and our role">
                <LegalP>
                    Depending on how our platform is used in your care, certain information we
                    maintain may be protected health information (&quot;PHI&quot;) under the Health
                    Insurance Portability and Accountability Act of 1996 and its implementing
                    regulations (&quot;HIPAA&quot;). Your treating clinicians and their
                    organizations are typically responsible for HIPAA compliance for treatment,
                    payment, and healthcare operations. Where we handle PHI on behalf of a covered
                    entity or business associate, we do so under a business associate agreement or
                    comparable arrangement that requires appropriate safeguards.
                </LegalP>
                <LegalP>
                    If you have questions about how a specific provider uses or discloses your
                    medical records, please contact that provider&apos;s privacy office directly.
                </LegalP>
            </LegalSection>

            <LegalSection id="sharing" title="5. How we share information">
                <LegalP>We may share information as follows:</LegalP>
                <LegalUl>
                    <li>
                        <strong className="text-slate-800">With your providers:</strong> to deliver
                        telehealth services you request.
                    </li>
                    <li>
                        <strong className="text-slate-800">With service providers:</strong> vendors
                        who assist with hosting, analytics, customer support, communications,
                        security, and payment processing, subject to confidentiality and
                        data-processing terms.
                    </li>
                    <li>
                        <strong className="text-slate-800">For legal and safety reasons:</strong>{' '}
                        when required by law, to respond to valid legal process, or to protect the
                        rights, safety, and security of users, the public, or BacancyTeleCare.
                    </li>
                    <li>
                        <strong className="text-slate-800">Business transfers:</strong> in
                        connection with a merger, acquisition, financing, or sale of assets, subject
                        to applicable confidentiality obligations.
                    </li>
                    <li>
                        <strong className="text-slate-800">With your direction or consent:</strong>{' '}
                        when you ask us to share information or agree to a specific disclosure.
                    </li>
                </LegalUl>
                <LegalP>
                    We do not sell your personal information or your PHI for monetary consideration.
                    We may use aggregated or de-identified data that cannot reasonably identify you
                    for analytics, research, and service improvement, in accordance with applicable
                    law.
                </LegalP>
            </LegalSection>

            <LegalSection id="security" title="6. Security">
                <LegalP>
                    We implement administrative, technical, and physical safeguards designed to
                    protect information against unauthorized access, loss, or alteration. These
                    measures include encryption in transit, access controls, secure development
                    practices, employee training, and vendor oversight. No method of transmission or
                    storage is completely secure; we encourage you to use strong passwords and
                    protect your devices.
                </LegalP>
            </LegalSection>

            <LegalSection id="retention" title="7. Retention">
                <LegalP>
                    We retain information for as long as necessary to provide the services, comply
                    with legal and professional recordkeeping obligations (including healthcare
                    retention rules), resolve disputes, and enforce our agreements. Retention
                    periods may vary based on the type of data and jurisdiction.
                </LegalP>
            </LegalSection>

            <LegalSection id="your-rights" title="8. Your choices and rights">
                <LegalP>
                    Depending on where you live, you may have rights to access, correct, delete,
                    restrict, or port certain personal information, or to object to certain
                    processing. If you are a California resident, you may have additional rights
                    under the California Consumer Privacy Act (CCPA), as amended (&quot;CPRA&quot;),
                    including the right to know what personal information we collect and share, and
                    the right to limit certain uses of sensitive personal information.
                </LegalP>
                <LegalP>
                    To exercise privacy rights, contact us using the information below. We may need
                    to verify your identity before fulfilling a request. You may designate an
                    authorized agent where permitted by law. You may appeal certain decisions as
                    required by applicable state privacy laws.
                </LegalP>
                <LegalP>
                    For HIPAA rights (such as access to or amendment of PHI maintained by a
                    provider), submit your request to the applicable healthcare provider or their
                    designated privacy official.
                </LegalP>
            </LegalSection>

            <LegalSection id="cookies" title="9. Cookies and similar technologies">
                <LegalP>
                    We use cookies and similar technologies to operate the site, remember
                    preferences, measure performance, and improve user experience. You can control
                    cookies through your browser settings; disabling certain cookies may limit
                    functionality.
                </LegalP>
            </LegalSection>

            <LegalSection id="children" title="10. Children">
                <LegalP>
                    Our services are not intended for children under 13, and we do not knowingly
                    collect personal information from children under 13 without verifiable parental
                    consent where required. If you believe we have collected information from a
                    child under 13 in error, please contact us so we can delete it promptly.
                </LegalP>
            </LegalSection>

            <LegalSection id="international" title="11. International users">
                <LegalP>
                    BacancyTeleCare is based in the United States. If you access the platform from
                    outside the United States, you consent to the transfer and processing of your
                    information in the United States and other countries that may have different
                    data protection laws than your country of residence.
                </LegalP>
            </LegalSection>

            <LegalSection id="changes" title="12. Changes to this policy">
                <LegalP>
                    We may update this Privacy Policy from time to time. We will post the revised
                    policy on this page and update the &quot;Last updated&quot; date. For material
                    changes, we will provide additional notice where required by law (such as email
                    or an in-product alert).
                </LegalP>
            </LegalSection>

            <LegalSection id="contact" title="13. Contact us">
                <LegalP>
                    If you have questions about this Privacy Policy or our privacy practices,
                    contact:
                </LegalP>
                <LegalP>
                    <strong className="text-slate-800">BacancyTeleCare Inc.</strong>
                    <br />
                    Privacy Office
                    <br />
                    Email: privacy@bacancytelecare.com
                </LegalP>
            </LegalSection>
        </LegalDocumentShell>
    );
}
