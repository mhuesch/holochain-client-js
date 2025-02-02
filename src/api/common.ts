const ERROR_TYPE = "error";
export const DEFAULT_TIMEOUT = 15000;

export type Transformer<ReqO, ReqI, ResI, ResO> = {
  input: (req: ReqO) => ReqI;
  output: (res: ResI) => ResO;
};

export type Requester<Req, Res> = (req: Req, timeout?: number) => Promise<Res>;
export type RequesterUnit<Res> = () => Promise<Res>;
export type Tagged<T> = { type: string; data: T };

/**
 * Take a Requester function which deals with tagged requests and responses,
 * and return a Requester which deals only with the inner data types, also
 * with the optional Transformer applied to further modify the input and output.
 */
export const requesterTransformer =
  <ReqO, ReqI, ResI, ResO>(
    requester: Requester<Tagged<ReqI>, Tagged<ResI>>,
    tag: string,
    transform: Transformer<ReqO, ReqI, ResI, ResO> = identityTransformer
  ) =>
  async (req: ReqO, timeout?: number) => {
    const input = { type: tag, data: transform.input(req) };
    const response = await requester(input, timeout);
    const output = transform.output(response.data);
    return output;
  };
const identity = (x: any) => x;
const identityTransformer = {
  input: identity,
  output: identity,
};

export const catchError = (res: any) => {
  return res.type === ERROR_TYPE ? Promise.reject(res) : Promise.resolve(res);
};

export const promiseTimeout = (
  promise: Promise<any>,
  tag: string,
  ms: number
) => {
  let id: NodeJS.Timeout;

  const timeout = new Promise((_, reject) => {
    id = setTimeout(() => {
      clearTimeout(id);
      reject(new Error(`Timed out in ${ms}ms: ${tag}`));
    }, ms);
  });

  return new Promise((res, rej) => {
    Promise.race([promise, timeout])
      .then((a) => {
        clearTimeout(id);
        return res(a);
      })
      .catch((e) => {
        return rej(e);
      });
  });
};
