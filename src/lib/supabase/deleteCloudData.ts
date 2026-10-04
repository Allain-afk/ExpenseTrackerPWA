interface DeleteCloudDataDependencies {
  invokeDelete: () => Promise<{ error: { message: string } | null }>;
  clearLocalRows: () => Promise<void>;
  suspendSync: () => void;
  resumeSync: () => void;
  signOut: () => Promise<void>;
}

export async function deleteCloudData({
  invokeDelete,
  clearLocalRows,
  suspendSync,
  resumeSync,
  signOut,
}: DeleteCloudDataDependencies): Promise<void> {
  suspendSync();
  let error: { message: string } | null;
  try {
    ({ error } = await invokeDelete());
  } catch (requestError) {
    await signOut().catch(() => undefined);
    const message = requestError instanceof Error ? requestError.message : 'Network request failed';
    throw new Error(
      `We could not confirm whether cloud deletion completed (${message}). You have been signed out and cloud sync is paused on this device until you retry.`,
    );
  }
  if (error) {
    await signOut().catch(() => undefined);
    throw new Error(
      `We could not confirm whether cloud deletion completed (${error.message}). You have been signed out and cloud sync is paused on this device until you retry.`,
    );
  }

  try {
    await clearLocalRows();
  } catch {
    await signOut().catch(() => undefined);
    throw new Error(
      'Your cloud data was deleted, but this device could not clear its local copy. You have been signed out to prevent the data from syncing again.',
    );
  }

  resumeSync();
  await signOut();
}
