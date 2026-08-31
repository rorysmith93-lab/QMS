// A print-first PDF for posting on the shopfloor — landscape A4, a boxed
// title header, then one table row per hazard. Deliberately separate from
// risk-assessment-document.tsx (the stacked-block, portrait PDF that gets
// auto-filed into Safety Documents as the controlled record on approval):
// that one reads like a document, this one reads like a wall chart.
import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { RISK_BAND_FILL, riskBandFromScore } from "@/lib/risk-assessments";

const styles = StyleSheet.create({
  page: { padding: 24, fontSize: 8, fontFamily: "Helvetica" },

  // Title box — a single bordered header block with the logo, title, and
  // the key meta fields laid out in a row beneath it.
  titleBox: {
    border: "1.5pt solid #111827",
    borderRadius: 4,
    padding: 10,
    marginBottom: 10,
  },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  logo: { width: 90, height: 32, objectFit: "contain" },
  title: { fontSize: 16, fontFamily: "Helvetica-Bold", flexShrink: 1 },
  metaRow: { flexDirection: "row", marginTop: 8, paddingTop: 8, borderTop: "1pt solid #e5e7eb" },
  metaField: { flexGrow: 1 },
  metaLabel: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: "#6b7280",
    marginBottom: 1,
    textTransform: "uppercase",
  },
  metaValue: { fontSize: 9 },

  // Hazard table.
  table: { border: "1pt solid #111827" },
  tableHeaderRow: {
    flexDirection: "row",
    backgroundColor: "#111827",
  },
  tableHeaderCell: {
    padding: 4,
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: "#ffffff",
    textTransform: "uppercase",
    borderRight: "1pt solid #374151",
  },
  tableRow: {
    flexDirection: "row",
    borderTop: "1pt solid #d1d5db",
  },
  tableCell: {
    padding: 4,
    fontSize: 8,
    lineHeight: 1.3,
    borderRight: "1pt solid #d1d5db",
  },
  // Widths sum to exactly 100% so the table fills the full landscape
  // page width with no stray empty gap on the right.
  numCell: { width: "3%" },
  hazardCell: { width: "21%" },
  whoCell: { width: "15%" },
  controlsCell: { width: "19%" },
  scoreCell: { width: "11.5%", alignItems: "center" },
  scoreBadge: {
    borderRadius: 3,
    paddingVertical: 2,
    paddingHorizontal: 4,
    color: "#ffffff",
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    textAlign: "center",
  },
  scoreSub: { fontSize: 6.5, color: "#6b7280", marginTop: 1, textAlign: "center" },
  empty: { color: "#6b7280", padding: 8 },
  footer: {
    position: "absolute",
    bottom: 14,
    left: 24,
    right: 24,
    fontSize: 7,
    color: "#6b7280",
    flexDirection: "row",
    justifyContent: "space-between",
  },
});

export type PdfShopfloorHazard = {
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

function ScoreCell({ likelihood, severity, score }: { likelihood: number; severity: number; score: number }) {
  const band = riskBandFromScore(score);
  return (
    <View style={[styles.tableCell, styles.scoreCell]}>
      <View style={[styles.scoreBadge, { backgroundColor: RISK_BAND_FILL[band] }]}>
        <Text>{score}</Text>
      </View>
      <Text style={styles.scoreSub}>
        L{likelihood} × S{severity}
      </Text>
    </View>
  );
}

export function RiskAssessmentShopfloorDocument({
  title,
  documentNumber,
  revision,
  areaOrProcess,
  assessor,
  assessmentDateLabel,
  approvedDateLabel,
  reviewDueDateLabel,
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
  reviewDueDateLabel: string | null;
  logoBuffer: Buffer | null;
  hazards: PdfShopfloorHazard[];
}) {
  return (
    <Document title={title}>
      <Page size="A4" orientation="landscape" style={styles.page}>
        <View style={styles.titleBox}>
          <View style={styles.titleRow}>
            {logoBuffer && (
              // eslint-disable-next-line jsx-a11y/alt-text -- @react-pdf/renderer's Image, not an HTML <img>.
              <Image style={styles.logo} src={logoBuffer} />
            )}
            <Text style={styles.title}>{title}</Text>
          </View>
          <View style={styles.metaRow}>
            <View style={styles.metaField}>
              <Text style={styles.metaLabel}>Document Number</Text>
              <Text style={styles.metaValue}>{documentNumber || "—"}</Text>
            </View>
            <View style={styles.metaField}>
              <Text style={styles.metaLabel}>Revision</Text>
              <Text style={styles.metaValue}>{revision}</Text>
            </View>
            <View style={styles.metaField}>
              <Text style={styles.metaLabel}>Area / Process</Text>
              <Text style={styles.metaValue}>{areaOrProcess || "—"}</Text>
            </View>
            <View style={styles.metaField}>
              <Text style={styles.metaLabel}>Assessor</Text>
              <Text style={styles.metaValue}>{assessor || "—"}</Text>
            </View>
            <View style={styles.metaField}>
              <Text style={styles.metaLabel}>Assessment Date</Text>
              <Text style={styles.metaValue}>{assessmentDateLabel ?? "—"}</Text>
            </View>
            <View style={styles.metaField}>
              <Text style={styles.metaLabel}>Approved Date</Text>
              <Text style={styles.metaValue}>{approvedDateLabel ?? "—"}</Text>
            </View>
            <View style={styles.metaField}>
              <Text style={styles.metaLabel}>Next Review Due</Text>
              <Text style={styles.metaValue}>{reviewDueDateLabel ?? "—"}</Text>
            </View>
          </View>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeaderRow} fixed>
            <Text style={[styles.tableHeaderCell, styles.numCell]}>#</Text>
            <Text style={[styles.tableHeaderCell, styles.hazardCell]}>Hazard</Text>
            <Text style={[styles.tableHeaderCell, styles.whoCell]}>Who Might Be Harmed</Text>
            <Text style={[styles.tableHeaderCell, styles.controlsCell]}>Existing Controls</Text>
            <Text style={[styles.tableHeaderCell, styles.scoreCell]}>Initial Risk</Text>
            <Text style={[styles.tableHeaderCell, styles.controlsCell]}>Additional Controls</Text>
            <Text style={[styles.tableHeaderCell, styles.scoreCell]}>Residual Risk</Text>
          </View>

          {hazards.length === 0 && <Text style={styles.empty}>No hazards.</Text>}

          {hazards.map((hazard, index) => (
            <View key={index} style={styles.tableRow} wrap={false}>
              <Text style={[styles.tableCell, styles.numCell]}>{index + 1}</Text>
              <Text style={[styles.tableCell, styles.hazardCell]}>{hazard.hazardDescription}</Text>
              <Text style={[styles.tableCell, styles.whoCell]}>{hazard.whoMightBeHarmed || "—"}</Text>
              <Text style={[styles.tableCell, styles.controlsCell]}>{hazard.existingControls || "—"}</Text>
              <ScoreCell
                likelihood={hazard.initialLikelihood}
                severity={hazard.initialSeverity}
                score={hazard.initialScore}
              />
              <Text style={[styles.tableCell, styles.controlsCell]}>{hazard.additionalControls || "—"}</Text>
              <ScoreCell
                likelihood={hazard.residualLikelihood}
                severity={hazard.residualSeverity}
                score={hazard.residualScore}
              />
            </View>
          ))}
        </View>

        <View style={styles.footer} fixed>
          <Text>{title} — for shopfloor reference only; the controlled record is held in Safety Documents.</Text>
          <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
