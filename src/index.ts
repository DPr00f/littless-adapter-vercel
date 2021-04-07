import { Readable } from 'stream';

type AnyObject = {
  [key: string]: any
}

interface Request extends Readable {
  headers: AnyObject
  query: AnyObject
  raw: AnyObject
  path: string
  httpMethod: string
  cookies: AnyObject
  body: any
  _body: boolean
}

interface VercelEvent {
  multiValueHeaders: AnyObject
  headers: AnyObject
  query: AnyObject
  method: string
  url: string
  body: AnyObject
  cookies: AnyObject
}

type Header = {
  [key: string]: string
}

interface Result {
  _status: number;
  _headers: Header;
  status: (value: number) => any;
}

interface VercelResult {
  setHeader: (key: string, value: string) => any
  statusCode: number
  send: (...values: any[]) => any
}

export default class Netlify {
  values: any[];

  savedReq: any;

  constructor(...values: any[]) {
    this.values = values;
  }

  getRequest(): Request {
    const event = this.values[0] as VercelEvent;
    let parsedBody: any = event.body;
    if (typeof parsedBody === 'object') {
      parsedBody = JSON.stringify(parsedBody);
    }

    const body = new Readable();
    body._read = () => {};
    body.push(parsedBody);
    body.push(null);
    const req = body as Request;
    req.path = event.url.split('?')[0];
    req.query = event.query || {};
    req.httpMethod = event.method;
    req.headers = event.headers;
    req.cookies = event.cookies;
    req.body = event.body;
    req._body = true;
    req.raw = event;

    this.savedReq = req;

    return req as Request;
  }

  willReturnResponse(result: any, res: Result) {
    const vercelResult = this.values[1] as VercelResult;

    if (typeof result === 'object') {
      if (result.headers) {
        Object.keys(result.headers).forEach((k) => {
          vercelResult.setHeader(k, result.headers[k]);
        })
      }
      if (result.statusCode) {
        vercelResult.statusCode = result.statusCode;
      }
      if (result.body) {
        vercelResult.send(result.body);
      }
    }
    if (!result) {
      vercelResult.statusCode = 500;
      vercelResult.send({
        error: true,
        message: 'An error occurred in the application somewhere check console for details'
      });
      console.trace();
    }
  }
}
