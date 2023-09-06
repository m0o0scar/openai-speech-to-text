export const later = () => {
  let resolve: () => void;
  const promise = new Promise<void>((resolveFn) => {
    resolve = resolveFn;
  });

  return { promise, resolve: resolve! };
};

export type Later = ReturnType<typeof later>;
