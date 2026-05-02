export type TourChangedEvent = {
  kind: "tour_changed";
  appointmentId: number;
  previousTourId: number | null;
  nextTourId: number | null;
  previousTourName: string | null;
  nextTourName: string | null;
};

export type TagMutatedEvent = {
  kind: "tag_mutated";
  appointmentId: number;
  tagName: string;
  action: "added" | "removed";
};

export type AppointmentMutationEvent = TourChangedEvent | TagMutatedEvent;

export type ProjectTagMutatedEvent = {
  kind: "tag_mutated";
  projectId: number;
  tagName: string;
  action: "added" | "removed";
};

export type ProjectMutationEvent = ProjectTagMutatedEvent;
