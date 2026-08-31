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
  statement: { lineHeight: 1.6, fontSize: 12 },
});

export function QualityPolicyDocument({
  title,
  version,
  effectiveDateLabel,
  approvedBy,
  logoBuffer,
  statement,
}: {
  // Also doubles as the one property this component's props share by name
  // with react-pdf's own DocumentProps — without at least one, TypeScript
  // flags the createElement(...) call at the render site as a "no
  // properties in common" mismatch, even though a wrapper component
  // rendering <Document> is exactly the pattern react-pdf expects.
  title: string;
  version: number;
  effectiveDateLabel: string;
  approvedBy: string | null;
  logoBuffer: Buffer | null;
  statement: string;
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
            <Text style={styles.headerLabel}>Version</Text>
            <Text style={styles.headerValue}>{version}</Text>
          </View>
          <View style={styles.headerField}>
            <Text style={styles.headerLabel}>Effective Date</Text>
            <Text style={styles.headerValue}>{effectiveDateLabel}</Text>
          </View>
          <View style={styles.headerField}>
            <Text style={styles.headerLabel}>Approved By</Text>
            <Text style={styles.headerValue}>{approvedBy || "—"}</Text>
          </View>
        </View>

        <Text style={styles.statement}>{statement}</Text>
      </Page>
    </Document>
  );
}
