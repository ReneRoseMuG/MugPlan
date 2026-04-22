import { RESERVED_VACANT_TAG_NAME } from "@shared/appointmentCancellation";
import * as appointmentsRepository from "../repositories/appointmentsRepository";
import * as toursRepository from "../repositories/toursRepository";
import { isParkplatzTourName } from "../lib/systemTours";
import * as tagRelationsService from "./tagRelationsService";

type AppointmentTx = Parameters<Parameters<typeof appointmentsRepository.withAppointmentTransaction>[0]>[0];

export type AppointmentParkingDefaults =
  | { kind: "ready"; parkplatzTourId: number; geparktTagId: number }
  | { kind: "missing_parkplatz_tour" }
  | { kind: "missing_geparkt_tag" };

export type ParkAppointmentTxResult =
  | { kind: "updated" }
  | { kind: "not_found" }
  | { kind: "noop" }
  | { kind: "already_parked" }
  | { kind: "version_conflict" };

function findParkplatzTour(tours: Awaited<ReturnType<typeof toursRepository.getTours>>) {
  return tours.find((tour) => isParkplatzTourName(tour.name)) ?? null;
}

export async function getParkplatzTourId(): Promise<number | null> {
  const allTours = await toursRepository.getTours();
  return findParkplatzTour(allTours)?.id ?? null;
}

export async function getAppointmentParkingDefaults(): Promise<AppointmentParkingDefaults> {
  const allTours = await toursRepository.getTours();
  const parkplatzTour = findParkplatzTour(allTours);
  if (!parkplatzTour) {
    return { kind: "missing_parkplatz_tour" };
  }

  const geparktTag = await tagRelationsService.getTagByName(RESERVED_VACANT_TAG_NAME);
  if (!geparktTag) {
    return { kind: "missing_geparkt_tag" };
  }

  return {
    kind: "ready",
    parkplatzTourId: parkplatzTour.id,
    geparktTagId: geparktTag.id,
  };
}

export async function parkAppointmentTx(
  tx: AppointmentTx,
  params: {
    appointmentId: number;
    parkplatzTourId: number;
    geparktTagId: number;
    expectedVersion?: number;
    alreadyParkedMode: "error" | "noop";
  },
): Promise<ParkAppointmentTxResult> {
  const existing = await appointmentsRepository.getAppointmentTx(tx, params.appointmentId);
  if (!existing) {
    return { kind: "not_found" };
  }

  if (existing.tourId === params.parkplatzTourId) {
    return params.alreadyParkedMode === "error"
      ? { kind: "already_parked" }
      : { kind: "noop" };
  }

  const parkResult = await appointmentsRepository.setAppointmentParkTx(tx, {
    appointmentId: params.appointmentId,
    expectedVersion: params.expectedVersion ?? Number(existing.version),
    tourId: params.parkplatzTourId,
  });
  if (parkResult.kind === "version_conflict") {
    return { kind: "version_conflict" };
  }

  await appointmentsRepository.replaceAppointmentEmployeesTx(tx, params.appointmentId, []);
  await appointmentsRepository.addAppointmentTagTx(tx, params.appointmentId, params.geparktTagId);

  return { kind: "updated" };
}
