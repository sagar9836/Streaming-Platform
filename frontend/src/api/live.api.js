const liveRemoved = () => {
  throw new Error("Live streaming has been removed from this VOD platform.");
};

export const fetchLiveRoom = liveRemoved;
export const issueViewerToken = liveRemoved;
export const issuePublisherToken = liveRemoved;
export const fetchMyLiveSession = liveRemoved;
export const createLiveSession = liveRemoved;
export const startLiveSession = liveRemoved;
export const endLiveSession = liveRemoved;
export const fetchMyPremiereSession = liveRemoved;
export const schedulePremiereSession = liveRemoved;
export const cancelPremiereSession = liveRemoved;
export const endPremiereSession = liveRemoved;
