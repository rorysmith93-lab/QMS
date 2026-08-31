import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { RISK_BAND_FILL, riskBandFromScore, riskLevelFromScore } from "@/lib/risk-assessments";

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
  sectionHeading: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: "#6b7280",
    marginBottom: 8,
    textTransform: "uppercase",
  },
  hazard: { marginBottom: 14, paddingBottom: 12, borderBottom: "1pt solid #f1f5f9" },
  hazardTitle: { fontSize: 11, fontFamily: "Helvetica-Bold", marginBottom: 4 },
  fieldLabel: { fontSize: 8, fontFamily: "Helvetica-Bold", color: "#6b7280", marginTop: 4 },
  fieldValue: { fontSize: 10, lineHeight: 1.4 },
  scoreRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 },
  scoreBadge: {
    borderRadius: 3,
    paddingVertical: 2,
    paddingHorizontal: 6,
    color: "#ffffff",
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
  },
  scoreText: { fontSize: 9, color: "#374151" },
  empty: { color: "#6b7280" },
});

export type PdfHazard = {
  position: number;
  hazardDescription: string;
  whoMightBeHarmed: string | null;
  existingControls: string | null;
  initialLikelihood: number;
  initialSeverity: number;
  initialScore: number;
  additionalControls: string | null;
  residualLikelihood: number;
  residualSeverity: number;
  residualScore: number;
};

function ScoreBadge({ label, likelihood, severity, score }: { label: string; likelihood: number; severity: number; score: number }) {
  const band = riskBandFromScore(score);
  const level = riskLevelFromScore(score);
  return (
    <View style={styles.scoreRow}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={[styles.scoreBadge, { backgroundColor: RISK_BAND_FILL[band] }]}>
        <Text>
          {score} — {level.label}
        </Text>
      </View>
      <Text style={styles.scoreText}>
        (Likelihood {likelihood} × Severity {severity})
      </Text>
    </View>
  );
}

export function RiskAssessmentDocument({
  title,
  documentNumber,
  revision,
  areaOrProcess,
  assessor,
  assessmentDateLabel,
  approvedDateLabel,
  logoBuffer,
  hazards,
}: {
  title: string;
  documentNumber: string | null;
  revision: string;
  areaOrProcess: string | null;
  assessor: string | null;
  assessmentDateLabel: string | null;
  approvedDateLabel: string | null;
  logoBuffer: Buffer | null;
  hazards: PdfHazard[];
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
            <Text style={styles.headerLabel}>Area / Process</Text>
            <Text style={styles.headerValue}>{areaOrProcess || "—"}</Text>
          </View>
          <View style={styles.headerField}>
            <Text style={styles.headerLabel}>Assessor</Text>
            <Text style={styles.headerValue}>{assessor || "—"}</Text>
          </View>
          <View style={styles.headerField}>
            <Text style={styles.headerLabel}>Assessment Date</Text>
            <Text style={styles.headerValue}>{assessmentDateLabel ?? "—"}</Text>
          </View>
          <View style={styles.headerField}>
            <Text style={styles.headerLabel}>Approved Date</Text>
            <Text style={styles.headerValue}>{approvedDateLabel ?? "—"}</Text>
          </View>
        </View>

        <Text style={styles.sectionHeading}>Hazards</Text>
        {hazards.length === 0 && <Text style={styles.empty}>No hazards.</Text>}
        {hazards.map((hazard, index) => (
          <View key={index} style={styles.hazard} wrap={false}>
            <Text style={styles.hazardTitle}>
              Hazard {index + 1}: {hazard.hazardDescription}
            </Text>

            {hazard.whoMightBeHarmed && (
              <>
                <Text style={styles.fieldLabel}>Who Might Be Harmed</Text>
                <Text style={styles.fieldValue}>{hazard.whoMightBeHarmed}</Text>
              </>
            )}

            {hazard.existingControls && (
              <>
                <Text style={styles.fieldLabel}>Existing Controls</Text>
                <Text style={styles.fieldValue}>{hazard.existingControls}</Text>
              </>
            )}

            <ScoreBadge
              label="Initial Risk"
              likelihood={hazard.initialLikelihood}
              severity={hazard.initialSeverity}
              score={hazard.initialScore}
            />

            {hazard.additionalControls && (
              <>
                <Text style={styles.fieldLabel}>Additional Controls</Text>
                <Text style={styles.fieldValue}>{hazard.additionalControls}</Text>
              </>
            )}

            <ScoreBadge
              label="Residual Risk"
              likelihood={hazard.residualLikelihood}
              severity={hazard.residualSeverity}
              score={hazard.residualScore}
            />
          </View>
        ))}
      </Page>
    </Document>
  );
}
