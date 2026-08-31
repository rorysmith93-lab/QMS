import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: { padding: 36, fontSize: 11, fontFamily: "Helvetica" },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 10 },
  logo: { width: 110, height: 40, objectFit: "contain" },
  title: { fontSize: 18, fontFamily: "Helvetica-Bold", flexShrink: 1 },
  headerTable: {
    flexDirection: "row",
    marginBottom: 18,
    paddingBottom: 12,
    borderBottom: "1pt solid #e5e7eb",
  },
  headerField: { flexGrow: 1 },
  headerLabel: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: "#6b7280",
    marginBottom: 2,
    textTransform: "uppercase",
  },
  headerValue: { fontSize: 10 },
  section: { marginBottom: 14, paddingBottom: 14, borderBottom: "1pt solid #e5e7eb" },
  sectionHeading: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: "#6b7280",
    marginBottom: 6,
    textTransform: "uppercase",
  },
  sectionBody: { lineHeight: 1.4 },
  step: { marginBottom: 12, paddingBottom: 10, borderBottom: "1pt solid #f1f5f9" },
  stepTitle: { fontSize: 11, fontFamily: "Helvetica-Bold", marginBottom: 4 },
  stepBody: { lineHeight: 1.4 },
  stepLink: { marginTop: 4, fontSize: 9, color: "#6b7280" },
  empty: { color: "#6b7280" },
});

export type PdfSopStep = {
  description: string;
  linkedWorkInstructionLabel: string | null;
};

export function SopDocument({
  title,
  documentNumber,
  revision,
  approvedDateLabel,
  logoBuffer,
  purpose,
  scope,
  responsibilities,
  referenceNotes,
  steps,
}: {
  title: string;
  documentNumber: string | null;
  revision: string;
  approvedDateLabel: string | null;
  logoBuffer: Buffer | null;
  purpose: string | null;
  scope: string | null;
  responsibilities: string | null;
  referenceNotes: string | null;
  steps: PdfSopStep[];
}) {
  return (
    <Document title={title}>
      <Page size="A4" style={styles.page}>
        <View style={styles.headerRow}>
          {logoBuffer && (
            // eslint-disable-next-line jsx-a11y/alt-text -- @react-pdf/renderer's Image, not an HTML <img>.
            <Image style={styles.logo} src={logoBuffer} />
          )}
          <Text style={styles.title}>{title}</Text>
        </View>

        <View style={styles.headerTable}>
          <View style={styles.headerField}>
            <Text style={styles.headerLabel}>Document Number</Text>
            <Text style={styles.headerValue}>{documentNumber || "—"}</Text>
          </View>
          <View style={styles.headerField}>
            <Text style={styles.headerLabel}>Revision</Text>
            <Text style={styles.headerValue}>{revision}</Text>
          </View>
          <View style={styles.headerField}>
            <Text style={styles.headerLabel}>Approved Date</Text>
            <Text style={styles.headerValue}>{approvedDateLabel ?? "—"}</Text>
          </View>
        </View>

        {purpose && (
          <View style={styles.section}>
            <Text style={styles.sectionHeading}>Purpose</Text>
            <Text style={styles.sectionBody}>{purpose}</Text>
          </View>
        )}

        {scope && (
          <View style={styles.section}>
            <Text style={styles.sectionHeading}>Scope</Text>
            <Text style={styles.sectionBody}>{scope}</Text>
          </View>
        )}

        {responsibilities && (
          <View style={styles.section}>
            <Text style={styles.sectionHeading}>Responsibilities</Text>
            <Text style={styles.sectionBody}>{responsibilities}</Text>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionHeading}>Procedure</Text>
          {steps.length === 0 && <Text style={styles.empty}>No steps.</Text>}
          {steps.map((step, index) => (
            <View key={index} style={styles.step} wrap={false}>
              <Text style={styles.stepTitle}>Step {index + 1}</Text>
              <Text style={styles.stepBody}>{step.description}</Text>
              {step.linkedWorkInstructionLabel && (
                <Text style={styles.stepLink}>See: {step.linkedWorkInstructionLabel}</Text>
              )}
            </View>
          ))}
        </View>

        {referenceNotes && (
          <View style={styles.section}>
            <Text style={styles.sectionHeading}>References</Text>
            <Text style={styles.sectionBody}>{referenceNotes}</Text>
          </View>
        )}
      </Page>
    </Document>
  );
}
