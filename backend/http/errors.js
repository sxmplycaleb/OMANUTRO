class HttpError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.name = "HttpError";
    this.statusCode = statusCode;
  }
}

function badRequest(message) {
  return new HttpError(400, message);
}

function unauthorized(message) {
  return new HttpError(401, message);
}

function forbidden(message) {
  return new HttpError(403, message);
}

function notFound(message) {
  return new HttpError(404, message);
}

function tooManyRequests(message) {
  return new HttpError(429, message);
}

module.exports = {
  HttpError,
  badRequest,
  unauthorized,
  forbidden,
  notFound,
  tooManyRequests
};
