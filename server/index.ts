import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { WebSocketServer } from 'ws';

// Ngăn chặn bot chạy trong web server process
process.env.BOT_DISABLED = 'true';

// Xử lý lỗi không có database một cách graceful
process.on('uncaughtException', (err) => {
  if (err.message.includes('DATABASE_URL')) {
    console.warn('⚠️ Database không được cấu hình, tiếp tục với chức năng hạn chế');
    return;
  }
  throw err;
});

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Enable CORS for Replit preview
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      // Loại bỏ tất cả express logs để tránh spam lag
      return;
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // WebSocket setup for console
  const wss = new WebSocketServer({
    port: 8080,
    host: '0.0.0.0',
    perMessageDeflate: false,
    clientTracking: true
  });


  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`🌐 Server đang chạy tại: http://0.0.0.0:${port}`);
    log(`🎮 Preview URL: https://${process.env.REPL_SLUG || 'workspace'}.${process.env.REPL_OWNER || 'user'}.repl.co`);
  });
})();

// Add global error handlers để catch unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.log('🔴 Unhandled Rejection at:', promise, 'reason:', reason)
  // Không crash app, chỉ log error
})

// Add global error handlers để catch uncaught exceptions
process.on('uncaughtException', (error) => {
  console.log('🔴 Uncaught Exception:', error)
  // Không crash app cho development
  if (process.env.NODE_ENV !== 'production') {
    console.log('⚠️ Continuing in development mode...')
  } else {
    process.exit(1)
  }
})