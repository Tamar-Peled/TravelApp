import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import type { PlaceCategory } from "@prisma/client";
import { placeCategoryLabel } from "@/lib/place-category-labels";
import { PDF_BRAND } from "@/lib/place-category-pdf";
import { PDF_BUILTIN_FONTS } from "@/lib/pdf-fonts";

const SLOTS = ["Morning", "Afternoon", "Evening"] as const;

export type PlannerPdfSlotItem = {
  title: string;
  category: PlaceCategory | null;
};

export type PlannerPdfDay = {
  dayNum: number;
  title: string;
  slots: Record<(typeof SLOTS)[number], PlannerPdfSlotItem[]>;
};

/** Built-in Helvetica / Helvetica-Bold only (stable with @react-pdf/renderer). */
function createPlannerPdfStyles() {
  const regular = PDF_BUILTIN_FONTS.regular;
  const bold = PDF_BUILTIN_FONTS.bold;
  return StyleSheet.create({
    page: {
      paddingTop: 36,
      paddingBottom: 44,
      paddingHorizontal: 36,
      fontFamily: regular,
      fontSize: 9,
      color: PDF_BRAND.ink,
      backgroundColor: PDF_BRAND.white,
    },
    coverBlock: {
      marginBottom: 22,
      paddingBottom: 14,
      borderBottomWidth: 1,
      borderBottomColor: PDF_BRAND.divider,
    },
    tripNameHero: {
      fontSize: 24,
      fontFamily: bold,
      color: PDF_BRAND.turquoise,
      letterSpacing: -0.4,
      marginBottom: 4,
    },
    tripNameRepeat: {
      fontSize: 8,
      fontFamily: regular,
      color: PDF_BRAND.muted,
      marginBottom: 10,
    },
    weekRow: {
      flexDirection: "row",
      alignItems: "baseline",
      marginBottom: 16,
      paddingBottom: 8,
      borderBottomWidth: 1,
      borderBottomColor: PDF_BRAND.divider,
    },
    weekTitle: {
      fontSize: 11,
      fontFamily: bold,
      color: PDF_BRAND.turquoise,
      letterSpacing: 0.5,
    },
    weekRange: {
      fontSize: 8,
      fontFamily: regular,
      color: PDF_BRAND.muted,
      marginLeft: 10,
    },
    row: {
      flexDirection: "row",
      marginBottom: 14,
      flexWrap: "wrap",
    },
    dayCell: {
      width: "31%",
      marginRight: "3.5%",
      marginBottom: 10,
      minHeight: 100,
      paddingLeft: 10,
      paddingRight: 6,
      paddingVertical: 8,
      borderLeftWidth: 2,
      borderLeftColor: PDF_BRAND.columnEdge,
      backgroundColor: PDF_BRAND.white,
    },
    dayCellLast: { marginRight: 0 },
    dayTitle: {
      fontSize: 9.5,
      fontFamily: bold,
      color: PDF_BRAND.turquoise,
      marginBottom: 10,
      paddingBottom: 6,
      borderBottomWidth: 1,
      borderBottomColor: PDF_BRAND.divider,
    },
    slotSection: {
      marginBottom: 10,
    },
    slotLabel: {
      fontSize: 7,
      fontFamily: bold,
      color: PDF_BRAND.turquoise,
      textTransform: "uppercase",
      letterSpacing: 2,
      marginBottom: 6,
    },
    itemBlock: {
      marginBottom: 8,
    },
    itemTitle: {
      fontSize: 11,
      fontFamily: regular,
      color: PDF_BRAND.ink,
      lineHeight: 1.35,
    },
    itemCategory: {
      fontSize: 9,
      fontFamily: regular,
      color: PDF_BRAND.categoryMuted,
      marginTop: 2,
    },
    emptySlotSpacer: {
      minHeight: 6,
    },
    footerNote: {
      position: "absolute",
      bottom: 28,
      left: 36,
      right: 36,
      fontSize: 7,
      fontFamily: regular,
      color: PDF_BRAND.muted,
      textAlign: "center",
    },
  });
}

const styles = createPlannerPdfStyles();

function ItemLine({ item }: { item: PlannerPdfSlotItem }) {
  const cat =
    item.category != null ? placeCategoryLabel(item.category) : null;
  return (
    <View style={styles.itemBlock} wrap={false}>
      <Text style={styles.itemTitle}>{item.title}</Text>
      {cat ? <Text style={styles.itemCategory}>{cat}</Text> : null}
    </View>
  );
}

function DayCell({
  day,
  isLastInRow,
}: {
  day: PlannerPdfDay;
  isLastInRow: boolean;
}) {
  return (
    <View style={isLastInRow ? [styles.dayCell, styles.dayCellLast] : styles.dayCell}>
      <Text style={styles.dayTitle}>{day.title}</Text>
      {SLOTS.map((slot) => {
        const items = day.slots[slot];
        return (
          <View key={slot} style={styles.slotSection}>
            <Text style={styles.slotLabel}>{slot.toUpperCase()}</Text>
            {items.length > 0 ? (
              items.map((item, i) => (
                <ItemLine key={`${slot}-${i}`} item={item} />
              ))
            ) : (
              <View style={styles.emptySlotSpacer} />
            )}
          </View>
        );
      })}
    </View>
  );
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    out.push(arr.slice(i, i + size));
  }
  return out;
}

/** Trip-relative weeks: days 1–7, 8–14, … */
export function groupPlannerDaysIntoWeeks(days: PlannerPdfDay[]): PlannerPdfDay[][] {
  return chunk(days, 7);
}

function weekDayRangeLabel(week: PlannerPdfDay[]): string {
  if (week.length === 0) return "";
  const first = week[0].dayNum;
  const last = week[week.length - 1].dayNum;
  return first === last ? `Day ${first}` : `Days ${first}–${last}`;
}

export function PlannerTripPdfDocument({
  tripName,
  weeks,
}: {
  tripName: string;
  weeks: PlannerPdfDay[][];
}) {
  return (
    <Document title={`${tripName} — Itinerary`} author="TravelAI">
      {weeks.map((week, wi) => (
        <Page key={wi} size="A4" style={styles.page} wrap>
          {wi === 0 ? (
            <View style={styles.coverBlock}>
              <Text style={styles.tripNameHero}>{tripName}</Text>
            </View>
          ) : (
            <Text style={styles.tripNameRepeat}>{tripName}</Text>
          )}

          <View style={styles.weekRow}>
            <Text style={styles.weekTitle}>Week {wi + 1}</Text>
            <Text style={styles.weekRange}>{weekDayRangeLabel(week)}</Text>
          </View>

          {chunk(week, 3).map((row, ri) => (
            <View key={ri} style={styles.row}>
              {row.map((d, di) => (
                <DayCell
                  key={d.dayNum}
                  day={d}
                  isLastInRow={di === row.length - 1}
                />
              ))}
            </View>
          ))}

          <Text style={styles.footerNote} fixed>
            TravelAI · {tripName}
          </Text>
        </Page>
      ))}
    </Document>
  );
}

export function buildPlannerPdfDays(input: {
  dayCount: number;
  mergedItems: Record<string, string[]>;
  placeById: Map<
    string,
    {
      title: string;
      category: PlaceCategory | null;
    }
  >;
  daySlotKey: (day: number, slot: (typeof SLOTS)[number]) => string;
  dayHeaderLine: (day: number) => string;
}): PlannerPdfDay[] {
  const days: PlannerPdfDay[] = [];
  for (let d = 1; d <= input.dayCount; d++) {
    const slots: PlannerPdfDay["slots"] = {
      Morning: [],
      Afternoon: [],
      Evening: [],
    };
    for (const s of SLOTS) {
      const ids = input.mergedItems[input.daySlotKey(d, s)] ?? [];
      for (const id of ids) {
        const p = input.placeById.get(id);
        if (!p) continue;
        slots[s].push({
          title: p.title,
          category: p.category,
        });
      }
    }
    days.push({ dayNum: d, title: input.dayHeaderLine(d), slots });
  }
  return days;
}
