export const lazy = <T>(factory: () => Promise<T>): (() => Promise<T>) => {
  let promise: Promise<T> | null = null;

  return () => {
    if (!promise) promise = factory();

    return promise;
  };
};
