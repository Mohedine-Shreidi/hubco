/**
 * Global error handling middleware.
 * Catches all errors thrown in route handlers / other middleware.
 */
const errorHandler = (err, _req, res, _next) => {
    console.error(err.stack || err);

    const status = err.status || 500;
    const message =
        status === 500 ? 'Internal Server Error' : err.message;

    res.status(status).json({
        success: false,
        message,
        error: message,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
};

export default errorHandler;
