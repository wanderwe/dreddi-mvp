const GROUPS_CHANGED_EVENT = "dreddi:groups-changed";

export const notifyGroupsChanged = () => {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(GROUPS_CHANGED_EVENT));
};

export const subscribeToGroupsChanged = (listener: () => void) => {
  if (typeof window === "undefined") return () => undefined;

  const wrappedListener = () => {
    listener();
  };

  window.addEventListener(GROUPS_CHANGED_EVENT, wrappedListener);
  return () => {
    window.removeEventListener(GROUPS_CHANGED_EVENT, wrappedListener);
  };
};
