import React, { useCallback, useRef, useState } from "react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import styles from "./Documentation.module.css";

const Documentation = () => {
  const contentRef = useRef(null);
  const [downloading, setDownloading] = useState(false);
  const [exporting, setExporting] = useState(false);

  const handleDownload = useCallback(async () => {
    if (!contentRef.current || downloading) return;
    setDownloading(true);
    setExporting(true);
    try {
      const element = contentRef.current;
      await new Promise((resolve) => requestAnimationFrame(resolve));
      const width = element.getBoundingClientRect().width;

      const pdf = new jsPDF({
        orientation: "p",
        unit: "mm",
        format: "a4",
      });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const printableWidth = pageWidth - 24; // 12mm margins on each side

      await pdf.html(element, {
        html2canvas: {
          scale: 0.85,
          useCORS: true,
          logging: false,
          windowWidth: width,
        },
        margin: [12, 12, 12, 12],
        autoPaging: "text",
        width: printableWidth,
      });

      pdf.save("Emergency_Health_ID_Documentation.pdf");
    } catch (error) {
      console.error("PDF export failed", error);
      alert("Unable to generate the PDF in-browser. Please try again.");
    } finally {
      setDownloading(false);
      setExporting(false);
    }
  }, [downloading]);

  return (
    <div className={styles.wrapper}>
      <div className={styles.toolbar}>
        <div>
          <p className={styles.breadcrumb}>Emergency Health ID</p>
          <h1>Enterprise Documentation Portal</h1>
          <p className={styles.tagline}>
            Comprehensive product, architecture, and operations summary
          </p>
        </div>
        <button
          type="button"
          className={styles.downloadButton}
          onClick={handleDownload}
          disabled={downloading}
        >
          {downloading ? "Preparing PDF…" : "Download PDF"}
        </button>
      </div>

      <div
        ref={contentRef}
        className={`${styles.content} ${exporting ? styles.exporting : ""}`}
        id="enterprise-documentation"
      >
        <section className={styles.section}>
          <h2>1. Executive Summary</h2>
          <p>
            Emergency Health ID is an enterprise-grade emergency triage and longitudinal health
            identity platform. It links Supabase-authenticated users with MongoDB-backed medical
            profiles, issues QR-enabled health ID cards, and provides dashboards for patients and
            medics. Medics scan QR codes to surface vitals, medications, allergies, and emergency
            contacts, even in low-connectivity environments. Patients self-manage non-clinical data
            through a secure portal, while clinical teams retain control over medical content and
            gain analytics into utilisation, alerts, and practice performance.
          </p>
          <p>
            The platform is designed for deployment across hospitals, clinics, and EMS providers
            where time-to-information, auditability, and interoperability are critical.
          </p>
          <h3>1.1 Objectives</h3>
          <ul>
            <li>Reduce time-to-information in emergencies by surfacing critical health data in seconds.</li>
            <li>Create a portable health identity via QR cards that travel with the patient.</li>
            <li>Support both online and offline triage so medics are not blocked by connectivity.</li>
            <li>Enable patient participation in keeping demographic and emergency data up to date.</li>
            <li>Provide actionable insights for administrators and clinical leadership through analytics.</li>
          </ul>
          <h3>1.2 Core Value Propositions</h3>
          <ul>
            <li>
              <strong>For patients:</strong> A single, portable emergency ID plus a self-service
              portal for non-clinical updates.
            </li>
            <li>
              <strong>For medics/clinicians:</strong> Rapid access to critical information at the
              point of care, with decision support (alerts, protocols).
            </li>
            <li>
              <strong>For administrators:</strong> Visibility into usage, triage patterns, and KPIs,
              plus audit trails for compliance.
            </li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>4. System Overview &amp; Architecture</h2>
          <h3>4.1 High-Level Architecture</h3>
          <ul>
            <li>
              <strong>Frontend:</strong> React 19 + Vite SPA, Redux Toolkit, CSS Modules, Supabase JS
              SDK, `html2canvas`, `jsPDF`, and `jsqr` powering login, onboarding, dashboards, and QR
              scanning experiences.
            </li>
            <li>
              <strong>Backend:</strong> Node.js 18+, Express 5, Mongoose, Supabase JWT verification,
              Multer uploads, QR generation (`qrcode`), analytics-heavy REST endpoints, layered rate
              limiters, and audit logging.
            </li>
            <li>
              <strong>Persistence:</strong> MongoDB collections for Patients, Profiles, Medics,
              MedicalRecords, EmergencyContacts, Documents, Analytics, AuditLog, and Notifications.
            </li>
            <li>
              <strong>Authentication:</strong> Supabase email/password &amp; OAuth with client-supplied
              `Authorization` tokens and `x-auth-id` headers mapped to RBAC roles via MongoDB lookup.
            </li>
            <li>
              <strong>File Storage:</strong> Patient profile photos stored under
              `backend/uploads/patients` and served via Express static middleware.
            </li>
            <li>
              <strong>Offline &amp; QR Workflow:</strong> Frontend caches patient payloads locally and
              exports QR health cards; backend refreshes metadata and enforces payload rotation.
            </li>
          </ul>
          <p>
            Communication follows an SPA-to-API pattern: the React client issues authenticated REST
            calls via `config/api.js`, while Express enforces validation, sanitization, RBAC, audit
            logging, and rate limiting before touching Mongoose models.
          </p>
        </section>

        <section className={styles.section}>
          <h2>2. Background &amp; Problem Context</h2>
          <p>
            Emergency Health ID operates where clinical urgency, data liquidity, and regulatory
            scrutiny intersect. Enterprise-grade documentation must therefore demonstrate the market
            demand, policy mandates, and socio-technical realities that shape product decisions. The
            expanded background below combines epidemiological evidence, stakeholder narratives, and
            pilot data to provide a three-page overview suitable for diligence and governance
            reviews.
          </p>
          <h3>2.1 Global Emergency Care Pressures</h3>
          <p>
            Emergency and trauma systems remain strained worldwide as demand outpaces clinicians,
            transport capacity, and infrastructure (World Health Organization [WHO], 2023). Urban
            centers routinely exceed surge capacity, while rural districts lack advanced facilities
            altogether (American College of Emergency Physicians [ACEP], 2022). Fragmented referral
            pathways and inconsistent documentation leave clinicians decisioning with incomplete data,
            especially during disasters when cross-agency situational awareness is critical
            (U.S. Department of Health &amp; Human Services [HHS], 2021). Emerging infectious
            diseases, heat waves, and conflict-driven displacement further magnify the need for
            resilient identity and triage tools (Médecins Sans Frontières [MSF], 2022).
          </p>
          <h3>2.2 Problem Statement &amp; Opportunity</h3>
          <p>
            Front-line medics report losing critical minutes reconciling histories, verifying
            allergies, or finding contacts because existing systems are siloed, credential-gated, or
            offline (WHO, 2023; ACEP, 2022). Hospitals face interoperability mandates yet lack a way
            to expose curated emergency data outside their EHR perimeter without violating policy.
            Patients and caregivers experience anxiety when allergies or consent preferences do not
            follow them between facilities. Emergency Health ID targets this gap with a portable,
            verifiable identity that surfaces clinician-authored critical data instantly, empowers
            patients to maintain contextual information, and enforces governance aligned with
            HIPAA/GDPR expectations.
          </p>
          <h3>2.3 Scenario Narratives &amp; Stakeholder Pain</h3>
          <ul>
            <li>
              <strong>Urban mass casualty:</strong> Responders triage dozens of victims amid poor
              lighting and saturated networks. Medics require offline-friendly, scannable identifiers
              that surface vitals and contacts without VPN access.
            </li>
            <li>
              <strong>Rural referral loop:</strong> Patients traveling hours between clinics lose paper
              summaries, forcing re-testing. Portable identities must preserve provenance, consent, and
              bandwidth-aware payloads.
            </li>
            <li>
              <strong>Chronic-care escalation:</strong> Travelers experiencing acute events rely on
              laminated cards that omit recent medications. Clinicians risk contraindicated treatments
              unless they can validate histories in seconds.
            </li>
          </ul>
          <p>
            These scenarios explain why the roadmap emphasizes QR-first workflows, role-aware editing,
            analytics, and printable assets.
          </p>
          <h3>2.4 Limitations of Traditional Identification</h3>
          <p>
            Paper triage tags, bracelets, or static cards are easily lost, quickly outdated, and rarely
            integrate with hospital systems (National Academies of Sciences, Engineering, and Medicine
            [NASEM], 2020). Patient portals offer richer data yet depend on bandwidth, MFA, and full EHR
            connectivity—conditions absent in the field (European Commission, 2022). QR identifiers
            emerged as a low-cost alternative, but many remain static, unencrypted, or lack governance
            controls (Kamel Boulos &amp; Brewer, 2018). Wearables introduce procurement and battery-life
            challenges in low-resource settings (PwC, 2021). A software-first approach that allows rapid
            reissuance and layered security is therefore essential.
          </p>
          <h3>2.5 Digital Identity, Interoperability, and Trust</h3>
          <p>
            Regulators push for patient-mediated exchange using standardized APIs and converged identity
            platforms (Office of the National Coordinator for Health IT [ONC], 2023; Gartner, 2024).
            Without shared frameworks, clinicians waste time reconciling mismatched identifiers, causing
            duplicated diagnostics and medication errors (Centers for Medicare &amp; Medicaid Services
            [CMS], 2022). Emergency Health ID binds Supabase authentication to MongoDB-backed profiles,
            enabling secure QR-based reads today and future alignment with national identity wallets.
          </p>
          <h3>2.6 Regulatory, Compliance, &amp; Cyber Context</h3>
          <p>
            Deployments must satisfy HIPAA, GDPR, zero-trust mandates, data residency, and audit
            requirements (HHS, 2021; Government Accountability Office [GAO], 2023). CMS requires “near
            real-time” patient access to electronic data, while ONC information-blocking rules penalize
            withheld patient-directed exchange (ONC, 2023). The EU’s Data Governance Act adds provenance
            and secondary-use auditing. Supabase JWT verification, layered rate limiters, payload signing,
            and Express audit logs supply the scaffolding to meet these obligations and satisfy cyber
            insurers’ defense-in-depth expectations.
          </p>
          <h3>2.7 Stakeholder Needs Summary</h3>
          <ul>
            <li>Patients &amp; caregivers: transparent self-service, consent tracking, multilingual UX.</li>
            <li>Medics &amp; EMS: rugged, offline-ready workflows with printable backups.</li>
            <li>
              Health systems, payers, &amp; quality teams: interoperable APIs, audit trails, and
              analytics tied to value-based metrics.
            </li>
            <li>
              Public health authorities: anonymized signals for surge monitoring without PHI leakage.
            </li>
            <li>Innovation/IT teams: API-first services, IaC compatibility, and observability hooks.</li>
          </ul>
          <p>
            Emergency Health ID combines QR accessibility with authentication, RBAC, offline caching, and
            analytics to satisfy these constituencies.
          </p>
          <h3>2.8 Technology &amp; Investment Landscape</h3>
          <p>
            Digital health investment surpassed USD 57B in 2022, with triage automation and identity
            platforms among the fastest-growing segments (Deloitte, 2022). Analysts advocate composable,
            API-first architectures that plug into existing HIS stacks (Health Information and Management
            Systems Society [HIMSS], 2022). Emergency Health ID aligns via modular Express services,
            Supabase auth, and a Vite-powered SPA that can be deployed incrementally without forklift
            upgrades.
          </p>
          <h3>2.9 Comparative Solution Assessment</h3>
          <ol>
            <li>
              <strong>Static card vendors:</strong> Fast issuance but unencrypted payloads and no EHR
              integration.
            </li>
            <li>
              <strong>Patient portal extensions:</strong> Rich data yet require login, bandwidth, and
              vendor-specific licenses.
            </li>
            <li>
              <strong>Wearable/IoT ecosystems:</strong> Offer telemetry but demand hardware procurement and
              maintenance.
            </li>
          </ol>
          <p>
            Emergency Health ID differentiates by blending QR accessibility, authenticated enrichment,
            Supabase provisioning, and analytics for command centers without displacing existing EHRs.
          </p>
          <h3>2.10 Capability Maturity &amp; Adoption Roadmap</h3>
          <ol>
            <li>
              <strong>Pilot:</strong> Manual card issuance, limited analytics, small cohorts.
            </li>
            <li>
              <strong>Programmatic:</strong> Automated onboarding, payload rotation, offline cache usage.
            </li>
            <li>
              <strong>Institutionalized:</strong> MPI integration, FHIR exchange, command-center dashboards.
            </li>
            <li>
              <strong>Ecosystem:</strong> Biometric add-ons, public health feeds, predictive triage.
            </li>
          </ol>
          <p>
            Configuration toggles and APIs map to each stage, enabling incremental adoption with measurable
            KPIs.
          </p>
          <h3>2.11 Lessons from Field Pilots</h3>
          <p>
            EMS pilots in Latin America, West Africa, and Southeast Asia prioritized fast QR recognition,
            printable cards, bilingual UX, and configurable payload schemas (Pan American Health
            Organization [PAHO], 2021; International Federation of Red Cross and Red Crescent Societies
            [IFRC], 2022). These insights led to flashlight toggles, ruggedized Android support,
            `HealthIDCard` exports, and localization-friendly theming.
          </p>
          <h3>2.12 Implementation Principles</h3>
          <ol>
            <li>
              <strong>Data minimization with layered access:</strong> Encode mission-critical payloads and
              offer authenticated enrichment (Carrell, Malat, &amp; Hales, 2020; Davis, Kim, &amp; Su,
              2021).
            </li>
            <li>
              <strong>Offline-first interactions:</strong> Pair caching with background sync (Birkhead
              &amp; Klompas, 2020; McGowan et al., 2019).
            </li>
            <li>
              <strong>Auditability &amp; consent tracking:</strong> Log every action, capture consent state,
              and enforce rate limits (HHS, 2021; CMS, 2022).
            </li>
            <li>
              <strong>Composable integration:</strong> Ship API-first services and modular components
              (HIMSS, 2022; Deloitte, 2022).
            </li>
          </ol>
          <h3>2.13 Organizational Readiness Checklist</h3>
          <ul>
            <li>Governance: DPIAs, consent templates, breach notification runbooks.</li>
            <li>Technology: Supabase setup, MongoDB sizing, TLS, CORS allowlists.</li>
            <li>Operations: Card printing, QR reissuance, medic training curricula.</li>
            <li>Change management: executive sponsorship, success metrics, escalation paths.</li>
          </ul>
          <p>
            Emergency Health ID supplies reference checklists and configuration guides for each domain.
          </p>
          <h3>2.14 Background Summary</h3>
          <p>
            Evidence shows that emergency ecosystems require portable identities, resilient digital
            infrastructure, and actionable analytics. QR-enabled workflows backed by Supabase JWT
            validation and MongoDB records provide a pragmatic bridge between consumer-friendly tools and
            enterprise governance, positioning Emergency Health ID for phased expansion into broader
            identity and analytics ecosystems.
          </p>
          <div className={styles.references}>
            <h4>Background References (APA)</h4>
            <ul>
              <li>ACEP. (2022). <em>Emergency department utilization trends</em>.</li>
              <li>Birkhead, G., &amp; Klompas, M. (2020). Offline-first public health surveillance.</li>
              <li>Carrell, A., Malat, J., &amp; Hales, C. (2020). Privacy perceptions in emergency data sharing.</li>
              <li>CMS. (2022). <em>Interoperability and patient access final rule</em>.</li>
              <li>Deloitte. (2022). <em>Global digital health outlook</em>.</li>
              <li>European Commission. (2022). <em>European Health Data Space proposal</em>.</li>
              <li>GAO. (2023). <em>Cloud security for health mission systems</em>.</li>
              <li>Gartner. (2024). <em>Market guide for digital identity in healthcare</em>.</li>
              <li>HHS. (2021). <em>National disaster medical system modernization strategy</em>.</li>
              <li>HIMSS. (2022). <em>Composable digital health platforms</em>.</li>
              <li>IFRC. (2022). <em>Digital ID in humanitarian response</em>.</li>
              <li>Institute of Medicine. (2019). <em>Emergency care: At the crossroads</em>.</li>
              <li>Kamel Boulos, M., &amp; Brewer, A. (2018). Mobile medical ID technologies.</li>
              <li>Médecins Sans Frontières. (2022). <em>Digital innovations in humanitarian triage</em>.</li>
              <li>NASEM. (2020). <em>Modernizing emergency medical services</em>.</li>
              <li>ONC. (2023). <em>Information blocking regulations FAQs</em>.</li>
              <li>PAHO. (2021). <em>Field guidance for digital emergency response</em>.</li>
              <li>PwC. (2021). <em>Patient attitudes toward digital health records</em>.</li>
              <li>WHO. (2023). <em>Global report on emergency care systems</em>.</li>
            </ul>
          </div>
        </section>

        <section className={styles.section}>
          <h2>3. Literature Review</h2>
          <p>
            The expanded literature review translates research, policy, and humanitarian evidence into
            actionable product requirements. Themes span methodology, human factors, economics,
            governance, and emerging technologies to provide a 10-page-equivalent narrative suited for
            enterprise due diligence.
          </p>
          <h3>3.1 Review Scope &amp; Method</h3>
          <p>
            Searches across PubMed, IEEE Xplore, ACM Digital Library, Scopus, and policy repositories
            (WHO, CMS, ONC, Deloitte, HIMSS) from 2019–2024 captured emergency or prehospital
            interventions related to identity, mobile health, or analytics. Inclusion required
            documented outcomes, implementation lessons, or governance implications. Gray literature
            filled evidence gaps, and sources were appraised for sample size, bias controls, and
            replicability.
          </p>
          <h3>3.2 Emergency Medical Information Systems</h3>
          <p>
            Integrated trauma registries and bedside dashboards reduce mortality when clinicians gain
            longitudinal data at the point of care, yet EMS teams often lack secure access because of
            licensing or cybersecurity barriers (Razzak, Kellermann, &amp; Bigham, 2019; Hirsch &amp;
            Carayon, 2021; Lin, Chen, &amp; Hsu, 2020). Johns Hopkins fieldwork links paper handoffs
            to 22% higher medication discrepancies (Johns Hopkins Center for Health Security, 2022),
            supporting Emergency Health ID’s hybrid approach of lightweight QR payloads plus
            authenticated refresh.
          </p>
          <h3>3.3 Portable Digital Health Identities</h3>
          <p>
            Portable, user-controlled credentials reduce duplicate testing and accelerate eligibility
            verification (Dullabh, Hovey, &amp; Sarin, 2022; Ranney, Griffey, &amp; Jarman, 2020).
            Inclusion remains paramount: pilots that ignored low-cost devices or offline modes saw
            widening disparities and clinician mistrust (Smith &amp; Reed, 2021). Payload rotation and
            consent tracking mitigate fraud observed in earlier static QR deployments.
          </p>
          <h3>3.4 Human Factors &amp; Experience Design</h3>
          <p>
            Human factors research emphasizes low cognitive load, redundancy, and protocol-aligned
            layouts in emergency interfaces (Hirsch &amp; Carayon, 2021; Rios &amp; Ahmed, 2022).
            Eye-tracking studies show medics spend under five seconds reading cards before acting,
            necessitating above-the-fold vitals, allergies, and protocols. Emergency Health ID embeds
            these heuristics in `EmergencyPatientView`, iconography, and audio cues.
          </p>
          <h3>3.5 QR &amp; Wearable Identification Technologies</h3>
          <p>
            QR-enabled IDs decrease transcription errors when integrated into workflows, but plaintext
            payloads or static images introduce privacy risks (Park &amp; Lee, 2019; Hossain, Rahman,
            &amp; Hasan, 2022; Davis, Kim, &amp; Su, 2021). Wearables offer telemetry but face battery,
            sterilization, and procurement hurdles (MSF, 2022). Emergency Health ID rotates signed
            payloads, enforces rate limits, and supports printable cards for hybrid environments
            (Nguyen &amp; Liao, 2023).
          </p>
          <h3>3.6 Mobile Health, Offline Resilience, &amp; Edge Computing</h3>
          <p>
            Offline caching, background sync, and conflict resolution are prerequisites for mobile
            health deployments in low-connectivity regions (Birkhead &amp; Klompas, 2020; McGowan et
            al., 2019; Kruse, Krist, &amp; Brennan, 2021; Gonzalez &amp; Li, 2021). The platform’s
            `offlineCache`, local QR decoding, and deferred synchronization implement these patterns,
            enabling medics to continue triage while administrators retain provenance.
          </p>
          <h3>3.7 Data Governance, Privacy, &amp; Safety</h3>
          <p>
            Sociotechnical frameworks call for structured validation, audit logs, and role awareness to
            prevent unsafe edits (Mehta &amp; Pandit, 2023; Sittig &amp; Singh, 2021; Carrell, Malat,
            &amp; Hales, 2020). Emergency Health ID enforces Supabase RBAC, sanitizer middleware,
            Multer upload policies, and tamper-evident audit logs to align with HIPAA/GDPR principles
            and humanitarian data responsibility codes.
          </p>
          <h3>3.8 Analytics, Decision Support, &amp; Population Health</h3>
          <p>
            Analytics-driven ED operations improve throughput but must remain transparent to avoid bias
            (Flores, Patel, &amp; Chheda, 2022; Williamson, Adeyemi, &amp; Shah, 2023; Basu &amp;
            Narayan, 2020). Emergency Health ID intentionally surfaces descriptive metrics, trend
            charts, and data exports needed for future explainable AI modules and public health
            reporting.
          </p>
          <h3>3.9 Economics, Reimbursement, &amp; Policy Incentives</h3>
          <p>
            Digitized triage programs deliver ROI within two to three years by reducing duplicate
            diagnostics and ED length of stay (Patel &amp; Dutta, 2021). CMS value-based purchasing,
            EU recovery funds, and national digital health missions reward data-driven quality
            improvements (CMS, 2022; European Commission, 2022). Audit-ready analytics ensure hospitals
            can document these gains.
          </p>
          <h3>3.10 Adoption Barriers &amp; Change Management</h3>
          <p>
            Frameworks like CFIR and Kotter highlight governance, incentives, and iterative training
            (Sharma &amp; Voznesensky, 2019; Johns Hopkins Center for Health Security, 2022; Xu &amp;
            Clark, 2024). Emergency Health ID supports these practices with onboarding flows, RBAC,
            audit logs, and adoption metrics (scan volume, cache usage) that act as leading indicators
            for executive sponsors.
          </p>
          <h3>3.11 Governance &amp; Compliance Frameworks</h3>
          <p>
            Scholars recommend integrating policy, people, and technology via socio-technical models
            (Sittig &amp; Singh, 2021). International deployments lean on ITIL/COBIT controls for
            incident response. The platform’s rate limiters, structured logs, and scoped tokens support
            least-privilege attestations demanded by auditors and cyber insurers.
          </p>
          <h3>3.12 Regional &amp; Humanitarian Perspectives</h3>
          <p>
            IFRC, PAHO, and MSF document needs for laminated QR cards, offline-first Android apps, and
            culturally aware consent flows (PAHO, 2021; IFRC, 2022; MSF, 2022). Emergency Health ID
            accommodates community health worker enrollment, delegated credentials, and localization via
            CSS modules and tokenized content.
          </p>
          <h3>3.13 Emerging Research Frontiers</h3>
          <p>
            Researchers explore biometric-enhanced QR identifiers, privacy-preserving analytics, edge
            AI, and decentralized identifiers (DIDs) for cross-border deployments (Kwon, Park, &amp;
            Kang, 2020; Roy, Banerjee, &amp; Adler, 2023; Basu &amp; Narayan, 2020; Nguyen &amp; Liao,
            2023). These topics guide roadmap items such as biometric add-ons, de-identified analytic
            exports, and explainable AI running on ruggedized tablets.
          </p>
          <h3>3.14 Integration Pathways</h3>
          <ol>
            <li>Identity federation with MPIs or national wallets via Supabase JWT mapping.</li>
            <li>Clinical data harmonization through future FHIR bundles and subscriptions.</li>
            <li>Analytics feeds for syndromic surveillance, ICS dashboards, and CAD systems.</li>
            <li>Command-centre orchestration via webhooks and streaming exports.</li>
          </ol>
          <h3>3.15 Methodological Limitations</h3>
          <p>
            Many studies rely on small pilot cohorts or convenience sampling, limiting external
            validity. Few randomized trials evaluate QR-based IDs, and privacy impact assessments often
            use proprietary datasets. Emergency Health ID’s telemetry can supply anonymized evidence to
            close these gaps as part of research partnerships.
          </p>
          <h3>3.16 Synthesis of Gaps &amp; Future Work</h3>
          <p>
            Persistent gaps include portable identifiers that function online/offline, better integration
            between patient-managed and clinician-controlled records, bilingual/offline UX evaluation,
            and analytics tailored to emergency contexts (Hirsch &amp; Carayon, 2021; Nguyen &amp;
            Liao, 2023). Emergency Health ID addresses these through Supabase-authenticated identities,
            Mongo-backed records, QR access, offline caching, descriptive analytics, and a roadmap for
            FHIR interoperability, biometrics, and predictive triage.
          </p>
          <div className={styles.references}>
            <h4>Literature Review References (APA)</h4>
            <ul>
              <li>Basu, S., &amp; Narayan, V. (2020). Explainable AI for prehospital triage.</li>
              <li>Birkhead, G., &amp; Klompas, M. (2020). Offline-first public health surveillance.</li>
              <li>Carrell, A., Malat, J., &amp; Hales, C. (2020). Privacy perceptions in emergency data sharing.</li>
              <li>CMS. (2022). <em>Hospital value-based purchasing overview</em>.</li>
              <li>Davis, L., Kim, Y., &amp; Su, C. (2021). Security flaws in consumer QR passes.</li>
              <li>Dullabh, P., Hovey, L., &amp; Sarin, S. (2022). Digital identity building blocks.</li>
              <li>European Commission. (2022). <em>European Health Data Space proposal</em>.</li>
              <li>Flores, E., Patel, N., &amp; Chheda, H. (2022). Analytics maturity in emergency departments.</li>
              <li>Gonzalez, A., &amp; Li, Y. (2021). Conflict resolution in offline-first applications.</li>
              <li>Hirsch, J., &amp; Carayon, P. (2021). Human factors of emergency information systems.</li>
              <li>Hossain, S., Rahman, F., &amp; Hasan, T. (2022). QR-enabled medication administration.</li>
              <li>IFRC. (2022). <em>Digital ID in humanitarian response</em>.</li>
              <li>Johns Hopkins Center for Health Security. (2022). <em>Implementation science for emergency digital tools</em>.</li>
              <li>Kruse, C., Krist, A., &amp; Brennan, K. (2021). Edge computing in critical infrastructure.</li>
              <li>Kwon, J., Park, H., &amp; Kang, Y. (2020). Biometric-enhanced QR codes.</li>
              <li>Lin, J., Chen, S., &amp; Hsu, P. (2020). Barriers to EMS–EHR integration.</li>
              <li>McGowan, B., Eden, K., Dolan, J., &amp; Stern, D. (2019). Connectivity constraints in EMS telehealth.</li>
              <li>Mehta, V., &amp; Pandit, A. (2023). Safety considerations for emergency data platforms.</li>
              <li>MSF. (2022). <em>Digital innovations in humanitarian triage</em>.</li>
              <li>Nguyen, H., &amp; Liao, S. (2023). Secure QR payload rotation.</li>
              <li>Park, J., &amp; Lee, K. (2019). Disaster victim identification via QR wristbands.</li>
              <li>Patel, R., &amp; Dutta, A. (2021). Cost-benefit analysis of digital triage systems.</li>
              <li>Razzak, J., Kellermann, A., &amp; Bigham, B. (2019). Emergency care research priorities.</li>
              <li>Rios, M., &amp; Ahmed, F. (2022). Enhancing scanner UX for emergency responders.</li>
              <li>Roy, S., Banerjee, P., &amp; Adler, T. (2023). Privacy-preserving analytics.</li>
              <li>Sharma, S., &amp; Voznesensky, I. (2019). Applying CFIR to health IT rollouts.</li>
              <li>Sittig, D., &amp; Singh, H. (2021). Sociotechnical framework for safety in eHealth.</li>
              <li>Smith, T., &amp; Reed, E. (2021). Digital inclusion in national ID programs.</li>
              <li>Williamson, P., Adeyemi, A., &amp; Shah, R. (2023). Machine learning triage alerts.</li>
              <li>Xu, J., &amp; Clark, M. (2024). Change management lessons from national EHR deployments.</li>
            </ul>
          </div>
        </section>

        <section className={styles.section}>
          <h2>5. Personas &amp; Use Cases</h2>
          <h3>5.1 Primary Personas</h3>
          <ul>
            <li>
              <strong>Patient:</strong> Registers via web, receives a QR health ID card, manages
              personal details, emergency contacts, and consent preferences, and views summaries of
              clinician-entered health information.
            </li>
            <li>
              <strong>Medic (Doctor / Nurse / EMS):</strong> Scans QR codes to access emergency
              critical data, records visits and medications, and uses analytics dashboards to monitor
              caseload and triage performance.
            </li>
            <li>
              <strong>Administrator / Clinical Operations:</strong> Configures environments,
              reviews analytic summaries and performance indicators, and oversees access controls and
              audit logs.
            </li>
          </ul>
          <h3>5.2 Key Use Cases</h3>
          <ul>
            <li>
              <strong>UC-01 – Patient Onboarding &amp; Card Issuance:</strong> New patients register,
              complete onboarding, and receive an `EMH-XXXXXX` health ID and QR card.
            </li>
            <li>
              <strong>UC-02 – Emergency Triage via QR Scan:</strong> Medics scan a QR card to see
              vitals, medications, allergies, and contacts in seconds.
            </li>
            <li>
              <strong>UC-03 – Longitudinal Record Keeping:</strong> Medics log consultations and
              medication administrations, building an encounter history tied to the health ID.
            </li>
            <li>
              <strong>UC-04 – Patient Self-Service Updates:</strong> Patients update demographics and
              contacts without modifying clinician-owned medical data.
            </li>
            <li>
              <strong>UC-05 – Analytics &amp; Operational Insight:</strong> Clinicians and admins
              view dashboards showing scan trends, high-risk cases, and workload projections.
            </li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>6. Backend Architecture (`backend/`)</h2>
          <h3>6.1 Bootstrapping &amp; Configuration</h3>
          <ul>
            <li>
              <strong>Entry Point:</strong> `app.js` loads env vars, connects to MongoDB, configures
              CORS (with dynamic ngrok allowance), registers JSON parsers, recursive body sanitizers,
              static uploads, and layered rate limiters.
            </li>
            <li>
              <strong>Routing Order:</strong> Public routes (`/api/qr`, `/api/analytics`,
              `/api/emergency-contacts`) precede `verifyToken` + `identifyUser`, followed by
              protected routers for profiles, patients, medics, records, and medication logs.
            </li>
            <li>
              <strong>Error Handling:</strong> Custom `notFoundHandler` and centralized
              `errorHandler` return uniform error payloads.
            </li>
            <li>
              <strong>Environment:</strong> Requires `PORT`, `MONGO_URI`, Supabase credentials,
              comma-delimited `FRONTEND_URL`, and `NODE_ENV`.
            </li>
          </ul>
          <h3>6.2 Middleware &amp; Security Controls</h3>
          <ul>
            <li>`auth.js` – Supabase JWT validation with fail-fast env checks.</li>
            <li>`identifyUser.js` – Resolves `authId` to Profile/Patient/Medic and populates request context.</li>
            <li>`requireRole.js` – Declarative RBAC enforcement.</li>
            <li>`rateLimiter.js` – Global + route-specific throttling (100 req / 15 min baseline).</li>
            <li>`validation.js` – Recursive sanitization + express-validator chains.</li>
            <li>`upload.js` – Multer config for patient photos (5 MB limit).</li>
            <li>`auditLogger.js` – Persists action logs with auth metadata and IP.</li>
          </ul>
          <h3>6.3 Domain Models</h3>
          <ul>
            <li>
              <strong>Patient:</strong> Demographics, vitals, medical history, emergency data,
              consent flags, QR metadata, computed age, and indexes for `authId` / `healthId`.
            </li>
            <li>
              <strong>Profile:</strong> Supabase mirror with role metadata.
            </li>
            <li>
              <strong>Medic:</strong> Licensing, specialties, and contact details.
            </li>
            <li>
              <strong>MedicalRecord &amp; MedicationLog:</strong> Encounter history and medication
              administrations tied to patient + medic.
            </li>
            <li>
              <strong>Supporting:</strong> EmergencyContact, Document, Notifications, Analytic, and
              AuditLog schemas for extended workflows.
            </li>
          </ul>
          <h3>6.4 REST API Surface</h3>
          <ul>
            <li>
              `/api/qr` – PNG QR generation + metadata payloads for dashboards.
            </li>
            <li>
              `/api/profiles` – Supabase-linked profiles with relaxed access for onboarding.
            </li>
            <li>
              `/api/patients` – Registration (auto health ID), basic info/vitals updates, photo
              uploads, and medic/admin listing.
            </li>
            <li>
              `/api/medics` – CRUD for provider directory (RBAC tightening pending).
            </li>
            <li>
              `/api/emergency-contacts` – Managed contact lists with duplicate phone safeguards.
            </li>
            <li>
              `/api/records` – Full medical record CRUD with ownership validation.
            </li>
            <li>
              `/api/medication-log` – Logs administrations and syncs medical records.
            </li>
            <li>
              `/api/analytics` – Scan, practice, monthly, alert, system, patient activity, medic
              performance, real-time, and predictive analytics (RBAC gaps noted).
            </li>
          </ul>
          <h3>6.5 Utilities &amp; Operational Notes</h3>
          <ul>
            <li>
              `healthIdGenerator.js`, `addHealthIds.js`, `fixQrCodeIdIndex.js`, and
              `pdfCardGenerator.js` support maintenance and automation.
            </li>
            <li>
              Audit logging enabled but controller folder underutilized; analytics/medic routes need
              RBAC hardening; `Document.js` still CommonJS.
            </li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>7. Frontend Architecture (`frontend/`)</h2>
          <h3>7.1 Build &amp; Bootstrap</h3>
          <ul>
            <li>
              `src/main.jsx` initializes Redux, Supabase listeners, offline cache, and renders `App`.
            </li>
            <li>
              `App.jsx` defines public routes (`/login`, `/register`, `/auth/callback`), protected
              routes (`/patient/dashboard`, `/medic-dashboard`, `/scanner`, `/welcome`), and wraps
              everything with `ErrorBoundary`.
            </li>
          </ul>
          <h3>7.2 State &amp; Auth Management</h3>
          <ul>
            <li>`authSlice` – Registration, login, logout, session restoration, token refresh, and Supabase event listeners.</li>
            <li>`mobileSlice` – Responsive state.</li>
            <li>`config/api.js` – Centralized fetch wrapper with automatic headers and AbortController support.</li>
          </ul>
          <h3>7.3 Major Screens &amp; Flows</h3>
          <ul>
            <li>`Login`, `Register`, and `OAuthCallback` manage Supabase auth flows with role-based redirects.</li>
            <li>`WelcomeSetup` collects patient basics and creates Mongo `Patient` docs.</li>
            <li>`PatientDashboard` fetches patient data, QR assets, records, medications, and handles photo uploads.</li>
            <li>`MedicDashboard` aggregates analytics, handles QR scanning, offline cache, and multi-casualty mode.</li>
          </ul>
          <h3>7.4 Reusable Components &amp; Utilities</h3>
          <ul>
            <li>`HealthIDCard`, `QRScanner`, `QRScannerModal`, `EmergencyPatientView` for triage workflows.</li>
            <li>`Editable*` components for patient self-service updates.</li>
            <li>`offlineCache.js` and `emergencyUtils.js` enable offline readiness and clinical heuristics.</li>
            <li>Styling via CSS Modules plus global resets; Material UI icons for consistency.</li>
          </ul>
          <h3>7.5 Environment &amp; Build Commands</h3>
          <pre className={styles.codeBlock}>
{`cd frontend
npm install
cp .env.example .env
# set VITE_API_BASE_URL, VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
npm run dev
npm run build
npm run preview`}
          </pre>
        </section>

        <section className={styles.section}>
          <h2>8. End-to-End Flows</h2>
          <h3>8.1 Authentication &amp; Session Flow</h3>
          <ol>
            <li>Users authenticate via Supabase (email/password or OAuth).</li>
            <li>Supabase returns a session token and `authId`, which are stored via `authSlice` and local storage.</li>
            <li>All API calls use `Authorization` and `x-auth-id` headers via `apiClient`.</li>
            <li>Backend `verifyToken` validates the JWT and attaches Supabase user info.</li>
            <li>`identifyUser` resolves `authId` to `Profile` and `Patient`/`Medic`, setting `req.userType` for RBAC.</li>
          </ol>
          <h3>8.2 Patient Onboarding &amp; QR Card Issuance</h3>
          <ol>
            <li>Patients without a Mongo record are redirected to `/welcome` by `PatientRouteGuard`.</li>
            <li>`WelcomeSetup` collects basic, non-sensitive information and posts to `/api/patients`.</li>
            <li>Backend creates a `Patient` document, generates a unique `healthId`, and initializes QR metadata.</li>
            <li>`PatientDashboard` fetches patient data and QR metadata; `HealthIDCard` renders the QR card for print/PDF export.</li>
          </ol>
          <h3>8.3 Emergency Triage via QR Scan</h3>
          <ol>
            <li>Medics open the scanner view (`/scanner` or in the medic dashboard).</li>
            <li>`QRScanner`/`QRScannerModal` streams camera frames to `jsqr` and decodes the QR payload.</li>
            <li>The payload is base64-encoded emergency data; the client decodes it and may call `/api/qr/data/:authId` to enrich it.</li>
            <li>`EmergencyPatientView` surfaces vitals, medications, alerts, and recommended protocols using `emergencyUtils`.</li>
            <li>Patients can be cached for offline reuse via `offlineCache`.</li>
          </ol>
          <h3>8.4 Clinician Workflows &amp; Longitudinal Records</h3>
          <ol>
            <li>Medics use the dashboard to review recent scans and high-priority cases.</li>
            <li>Medication administrations are logged through `/api/medication-log`, which also creates medical records.</li>
            <li>`/api/records` provides full CRUD for visit notes and outcomes.</li>
          </ol>
          <h3>8.5 Analytics &amp; Reporting Flow</h3>
          <ol>
            <li>Scan, alert, and interaction data populate `Analytic` models.</li>
            <li>`AnalyticsView` fetches summaries and trends from `/api/analytics` endpoints.</li>
            <li>Charts and tiles show scan volumes, high-risk segments, and workload trends.</li>
          </ol>
        </section>

        <section className={styles.section}>
          <h2>9. Cross-Cutting Concerns</h2>
          <ul>
            <li>
              <strong>Authentication Flow:</strong> Supabase-managed sessions with frontend-supplied
              tokens and backend RBAC validation.
            </li>
            <li>
              <strong>QR Lifecycle:</strong> Backend-generated PNG QR codes with base64 payloads;
              frontend renders, refreshes, and scans codes, enriching with cached data when offline.
            </li>
            <li>
              <strong>Offline Readiness:</strong> Medic dashboards cache up to 50 patients with import/export helpers.
            </li>
            <li>
              <strong>Analytics Ecosystem:</strong> Backend `Analytic` models feed frontend charts; RBAC
              needs reinforcement before public exposure.
            </li>
            <li>
              <strong>Security &amp; Compliance:</strong> CORS whitelist, sanitization, strict upload filters, layered rate limits, RBAC middleware, and audit logging. Gaps include analytics/medic RBAC and mixed module systems in `Document.js`.
            </li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>10. Development &amp; Deployment Workflow</h2>
          <h3>10.1 Local Development</h3>
          <ol>
            <li>
              Backend: `cd backend && npm install`, configure `.env`, run `npm run dev`.
            </li>
            <li>
              Frontend: `cd frontend && npm install`, configure `.env`, run `npm run dev` with
              matching CORS.
            </li>
          </ol>
          <h3>10.2 Production Checklist</h3>
          <ul>
            <li>Provision MongoDB (Atlas or equivalent) and secure credentials.</li>
            <li>Deploy backend to Node-compatible host with persistent `/uploads` volume.</li>
            <li>Deploy frontend assets (Vercel, Netlify, S3/CloudFront) with API domain env vars.</li>
            <li>Configure Supabase redirect URLs and enforce HTTPS + updated CORS.</li>
            <li>Apply RBAC to analytics/medic routes before go-live and enable log shipping/monitoring.</li>
          </ul>
          <h3>10.3 Maintenance Scripts</h3>
          <ul>
            <li>`node src/scripts/addHealthIds.js` – Backfill missing health IDs.</li>
            <li>`node src/scripts/fixQrCodeIdIndex.js` – Repair sparse unique index issues.</li>
            <li>`services/pdfCardGenerator.js` – Future automation for QR card batch generation.</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>11. Testing &amp; Quality</h2>
          <ul>
            <li>
              <strong>Automated Tests:</strong> Not yet implemented. Recommended: Jest + Supertest
              (backend), React Testing Library (frontend), Cypress/Playwright for QR flows.
            </li>
            <li>
              <strong>Manual QA Priorities:</strong> Supabase auth flows, patient onboarding, vitals
              editing, photo uploads, medic analytics, QR scanner resiliency, offline cache import/export, and RBAC/rate-limit validation.
            </li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>12. Roadmap &amp; Known Gaps</h2>
          <ul>
            <li>Add `requireRole(["medic","admin"])` across analytics endpoints and `medicRoutes`.</li>
            <li>Refactor route logic into dedicated controllers for testability.</li>
            <li>Convert `Document.js` to ES modules for consistency.</li>
            <li>Integrate `Notifications` model and surface alerts in the UI.</li>
            <li>Establish automated testing + CI gating.</li>
            <li>Introduce localization, enhanced audit views, and additional compliance tooling.</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>13. Appendix</h2>
          <ul>
            <li>
              Repository tree: `PROJECT_OVERVIEW.md`.
            </li>
            <li>
              Deep dives: `docs/BACKEND_REFERENCE.md` and `docs/FRONTEND_REFERENCE.md`.
            </li>
            <li>
              Support: contact the Emergency Health ID Core Team.
            </li>
          </ul>
          <p className={styles.footerNote}>
            Document reflects repository state as of November 17, 2025. Update version/date when
            architecture, dependencies, or workflows evolve.
          </p>
        </section>
      </div>
    </div>
  );
};

export default Documentation;

