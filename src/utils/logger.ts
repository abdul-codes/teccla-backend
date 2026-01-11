import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';

// Define log levels
const levels = {
    error: 0,
    warn: 1,
    info: 2,
    http: 3,
    debug: 4,
};

// Define log level based on environment
const level = () => {
    const env = process.env.NODE_ENV || 'development';
    const isDevelopment = env === 'development';
    return isDevelopment ? 'debug' : 'info';
};

// Define colors for each level
const colors = {
    error: 'red',
    warn: 'yellow',
    info: 'green',
    http: 'magenta',
    debug: 'white',
};

// Tell winston that we want to link the colors
winston.addColors(colors);

// Custom format for console output
const consoleFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
    winston.format.colorize({ all: true }),
    winston.format.printf(
        (info) => `${info.timestamp} ${info.level}: ${info.message}`
    )
);

// JSON format for file/production output
const jsonFormat = winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
);

// Build transports based on environment
const buildTransports = () => {
    const transportsList: winston.transport[] = [
        // Console transport (always enabled)
        new winston.transports.Console({
            format: consoleFormat,
        }),
    ];

    // Only add file transports in development (not in Docker/production)
    if (process.env.NODE_ENV !== 'production') {
        const logsDir = path.join(process.cwd(), 'logs');

        transportsList.push(
            // Error log file
            new DailyRotateFile({
                filename: path.join(logsDir, 'error-%DATE%.log'),
                datePattern: 'YYYY-MM-DD',
                zippedArchive: true,
                maxSize: '20m',
                maxFiles: '14d',
                level: 'error',
                format: jsonFormat,
            }),
            // All logs file
            new DailyRotateFile({
                filename: path.join(logsDir, 'all-%DATE%.log'),
                datePattern: 'YYYY-MM-DD',
                zippedArchive: true,
                maxSize: '20m',
                maxFiles: '14d',
                format: jsonFormat,
            })
        );
    }

    return transportsList;
};

// Create the logger instance
const Logger = winston.createLogger({
    level: level(),
    levels,
    transports: buildTransports(),
});

export default Logger;

