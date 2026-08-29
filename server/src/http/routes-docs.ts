import type { FastifyInstance } from 'fastify';
import { buildOpenApiSpec } from '../openapi/spec.js';

/**
 * Serves OpenAPI 3.1 JSON and Swagger UI without extra npm packages
 * (Swagger UI assets loaded from CDN).
 *
 * - GET /openapi.json — raw OpenAPI document
 * - GET /docs         — Swagger UI
 */
export async function registerDocsRoutes(app: FastifyInstance): Promise<void> {
  app.get('/openapi.json', async (_req, reply) => {
    const spec = buildOpenApiSpec();
    return reply.type('application/json').send(spec);
  });

  app.get('/docs', async (_req, reply) => {
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Simplete API — Swagger UI</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5.17.14/swagger-ui.css" />
  <style>
    body { margin: 0; background: #fafafa; }
    .topbar { display: none; }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5.17.14/swagger-ui-bundle.js" crossorigin></script>
  <script src="https://unpkg.com/swagger-ui-dist@5.17.14/swagger-ui-standalone-preset.js" crossorigin></script>
  <script>
    window.onload = () => {
      window.ui = SwaggerUIBundle({
        url: '/openapi.json',
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [SwaggerUIBundle.presets.apis, SwaggerUIStandalonePreset],
        layout: 'StandaloneLayout',
        persistAuthorization: true,
        tryItOutEnabled: true,
      });
    };
  </script>
</body>
</html>`;
    return reply.type('text/html').send(html);
  });
}
