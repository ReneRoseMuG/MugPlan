type TourDisplayItem = {
  id: number;
  name: string;
};

const TOUR_NUMBER_PATTERN = /^Tour\s+(\d+)$/i;

function resolveTourDisplayRank(tour: TourDisplayItem): { group: 0 | 1; numberValue: number; nameValue: string } {
  const match = tour.name.trim().match(TOUR_NUMBER_PATTERN);
  if (match) {
    return {
      group: 0,
      numberValue: Number(match[1]),
      nameValue: tour.name,
    };
  }

  return {
    group: 1,
    numberValue: Number.POSITIVE_INFINITY,
    nameValue: tour.name,
  };
}

export function sortToursForDisplay<TTour extends TourDisplayItem>(tours: readonly TTour[]): TTour[] {
  return [...tours].sort((left, right) => {
    const leftRank = resolveTourDisplayRank(left);
    const rightRank = resolveTourDisplayRank(right);

    if (leftRank.group !== rightRank.group) {
      return leftRank.group - rightRank.group;
    }

    if (leftRank.numberValue !== rightRank.numberValue) {
      return leftRank.numberValue - rightRank.numberValue;
    }

    return leftRank.nameValue.localeCompare(rightRank.nameValue, "de", {
      numeric: true,
      sensitivity: "base",
    }) || left.id - right.id;
  });
}
