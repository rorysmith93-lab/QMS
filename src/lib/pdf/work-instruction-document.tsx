import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { PdfPpeIcon } from "@/lib/pdf/ppe-icon-pdf";
import { ppeLabel, PpeKey } from "@/lib/ppe";

function createStyles(fontRegular: string, fontBold: string) {
  return StyleSheet.create({
    page: { padding: 36, fontSize: 11, fontFamily: fontRegular },
    headerRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 10 },
    // A wide rectangular box rather than a square — a landscape logo
    // squeezed into a square box renders tiny and hard to read.
    logo: { width: 110, height: 40, objectFit: "contain" },
    // flexShrink so a long title still wraps within the remaining row
    // width instead of overflowing the page next to a wider logo box.
    title: { fontSize: 18, fontFamily: fontBold, flexShrink: 1 },
    headerTable: {
      flexDirection: "row",
      marginBottom: 18,
      paddingBottom: 12,
      borderBottom: "1pt solid #e5e7eb",
    },
    headerField: { flexGrow: 1 },
    headerLabel: {
      fontSize: 8,
      fontFamily: fontBold,
      color: "#6b7280",
      marginBottom: 2,
      textTransform: "uppercase",
    },
    headerValue: { fontSize: 10 },
    requirementsSection: {
      marginBottom: 14,
      paddingBottom: 14,
      borderBottom: "1pt solid #e5e7eb",
    },
    requirementsHeading: {
      fontSize: 9,
      fontFamily: fontBold,
      color: "#6b7280",
      marginBottom: 6,
      textTransform: "uppercase",
    },
    itemRow: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
    item: { alignItems: "center", width: 56 },
    equipmentImage: { width: 40, height: 40, objectFit: "contain" },
    itemLabel: { fontSize: 7, textAlign: "center", marginTop: 3 },
    step: { marginBottom: 18, paddingBottom: 14, borderBottom: "1pt solid #e5e7eb" },
    stepTitle: { fontSize: 13, fontFamily: fontBold, marginBottom: 6 },
    body: { marginBottom: 6, lineHeight: 1.4 },
    caution: {
      backgroundColor: "#fef3c7",
      color: "#78350f",
      padding: 8,
      borderRadius: 4,
      marginBottom: 6,
      fontSize: 10,
    },
    cautionLabel: { fontFamily: fontBold },
    image: { maxWidth: 320, maxHeight: 240, marginTop: 6, objectFit: "contain" },
    empty: { color: "#6b7280" },
  });
}

export type PdfStep = {
  title: string | null;
  body: string | null;
  caution: string | null;
  imageBuffer: Buffer | null;
};

export type PdfEquipmentItem = {
  name: string;
  imageBuffer: Buffer | null;
};

export function WorkInstructionDocument({
  title,
  documentNumber,
  revision,
  publishedDateLabel,
  logoBuffer,
  fontRegular,
  fontBold,
  ppeKeys,
  equipment,
  steps,
}: {
  title: string;
  documentNumber: string | null;
  revision: string;
  publishedDateLabel: string | null;
  logoBuffer: Buffer | null;
  fontRegular: string;
  fontBold: string;
  ppeKeys: PpeKey[];
  equipment: PdfEquipmentItem[];
  steps: PdfStep[];
}) {
  const styles = createStyles(fontRegular, fontBold);

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

        {/* Document header: the controlled-document metadata a QMS
            record is expected to carry, ahead of any requirements or
            steps. */}
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
            <Text style={styles.headerLabel}>Publish Date</Text>
            <Text style={styles.headerValue}>{publishedDateLabel ?? "—"}</Text>
          </View>
        </View>

        {ppeKeys.length > 0 && (
          <View style={styles.requirementsSection}>
            <Text style={styles.requirementsHeading}>Required PPE</Text>
            <View style={styles.itemRow}>
              {ppeKeys.map((key) => (
                <View key={key} style={styles.item}>
                  <PdfPpeIcon ppeKey={key} />
                  <Text style={styles.itemLabel}>{ppeLabel(key)}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {equipment.length > 0 && (
          <View style={styles.requirementsSection}>
            <Text style={styles.requirementsHeading}>Required Equipment</Text>
            <View style={styles.itemRow}>
              {equipment.map((item, index) => (
                <View key={index} style={styles.item}>
                  {item.imageBuffer && (
                    // @react-pdf/renderer's PDF-drawing <Image>, not an HTML <img>.
                    // eslint-disable-next-line jsx-a11y/alt-text
                    <Image style={styles.equipmentImage} src={item.imageBuffer} />
                  )}
                  <Text style={styles.itemLabel}>{item.name}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {steps.length === 0 && <Text style={styles.empty}>No steps yet.</Text>}

        {steps.map((step, index) => (
          <View key={index} style={styles.step} wrap={false}>
            <Text style={styles.stepTitle}>
              Step {index + 1}
              {step.title ? `: ${step.title}` : ""}
            </Text>
            {step.body && <Text style={styles.body}>{step.body}</Text>}
            {step.caution && (
              <Text style={styles.caution}>
                <Text style={styles.cautionLabel}>Caution: </Text>
                {step.caution}
              </Text>
            )}
            {/* eslint-disable-next-line jsx-a11y/alt-text -- this is @react-pdf/renderer's
                PDF-drawing <Image>, not an HTML <img>; it has no alt attribute. */}
            {step.imageBuffer && <Image style={styles.image} src={step.imageBuffer} />}
          </View>
        ))}
      </Page>
    </Document>
  );
}
