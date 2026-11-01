function errorHandler(error, req, res, next) {
    if (res.headersSent) {
        return next(error);
    }

    if (error.statusCode) {
        return res.status(error.statusCode).json({
            success: false,
            message: error.message,
        });
    }

    if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
        return res.status(400).json({
            success: false,
            message: 'Invalid JSON request body.',
        });
    }

    console.error('Unhandled request error:', error);
    return res.status(500).json({
        success: false,
        message: 'An unexpected error occurred.',
    });
}

module.exports = errorHandler;
