/**
 * Content for the eight stations.
 *
 * Everything below is a condensed, classroom-friendly summary of the Spanish
 * MDN Web Docs pages on HTTP. Each station links back to its source article.
 *
 * angle: position on the island ring, in degrees (0 = east, 90 = south)
 * radius: distance from the central origin server
 */
export const STATIONS = [
  {
    id: 'client-server',
    n: '01',
    name: 'Cliente y servidor',
    tag: 'ARQUITECTURA',
    accent: '#e4572e',
    angle: 90,
    radius: 27.5,
    icon: 'hub',
    headline: 'Dos interlocutores, una conversación.',
    summary:
      'HTTP (Hypertext Transfer Protocol) es un protocolo de la capa de aplicación para transmitir documentos hipermedia, como HTML. El cliente abre la conexión, hace una petición y espera; el servidor la procesa y devuelve una respuesta.',
    points: [
      {
        term: 'Cliente',
        text: 'Normalmente tu navegador. Inicia la conversación y nunca responde peticiones por su cuenta.',
      },
      {
        term: 'Servidor',
        text: 'Escucha en un puerto (80 para HTTP, 443 para HTTPS), interpreta la petición y responde.',
      },
      {
        term: 'Sin estado',
        text: 'No recuerda peticiones anteriores. La continuidad se construye con cookies, sesiones y caché.',
      },
      {
        term: 'Recursos',
        text: 'Cada recurso tiene una URL con esquema, host, puerto, ruta y query. HTTP no inventa direcciones: las usa.',
      },
    ],
    note: 'HTTP/1 y HTTP/2 suelen viajar sobre TCP. HTTP/3 usa QUIC sobre UDP. La semántica es la misma; cambia el transporte.',
    codeLabel: 'Una petición y su respuesta',
    code: [
      'GET /es/docs/Web/HTTP HTTP/1.1',
      'Host: developer.mozilla.org',
      'Accept: text/html',
      '',
      'HTTP/1.1 200 OK',
      'Content-Type: text/html; charset=utf-8',
      'Content-Length: 24871',
      '',
      '<!doctype html> ...',
    ],
    mdn: {
      label: 'Generalidades de HTTP',
      url: 'https://developer.mozilla.org/es/docs/Web/HTTP/Guides/Overview',
    },
  },
  {
    id: 'messages',
    n: '02',
    name: 'Mensajes HTTP',
    tag: 'ESTRUCTURA',
    accent: '#2f5bea',
    angle: 135,
    radius: 27.5,
    icon: 'mail',
    headline: 'Toda comunicación es un mensaje.',
    summary:
      'Una petición y una respuesta comparten la misma anatomía: una línea inicial, cabeceras, una línea vacía y, opcionalmente, un cuerpo. Ese formato simple es lo que hace a HTTP fácil de leer y de depurar.',
    points: [
      {
        term: 'Línea de petición',
        text: 'Método + objetivo + versión: GET /index.html HTTP/1.1.',
      },
      {
        term: 'Línea de estado',
        text: 'Versión + código + razón: HTTP/1.1 404 Not Found.',
      },
      {
        term: 'Cabeceras',
        text: 'Pares Nombre: valor con metadatos del mensaje, del recurso o de la conexión.',
      },
      {
        term: 'Cuerpo',
        text: 'Opcional. Lleva el recurso (HTML, JSON, imagen...) o los datos que envía el cliente.',
      },
    ],
    note: 'En HTTP/2 y HTTP/3 los mensajes se dividen en tramas binarias, pero la semántica —método, estado, cabeceras— no cambia.',
    codeLabel: 'POST con cabeceras y cuerpo',
    code: [
      'POST /api/users HTTP/1.1',
      'Host: api.example.com',
      'Content-Type: application/json',
      'Content-Length: 46',
      '',
      '{"name":"Ada","role":"engineer","active":true}',
      '',
      'HTTP/1.1 201 Created',
      'Location: /api/users/42',
    ],
    mdn: {
      label: 'Mensajes HTTP',
      url: 'https://developer.mozilla.org/es/docs/Web/HTTP/Guides/Messages',
    },
  },
  {
    id: 'methods',
    n: '03',
    name: 'Métodos',
    tag: 'INTENCIÓN',
    accent: '#7a5cff',
    angle: 180,
    radius: 27.5,
    icon: 'methods',
    headline: 'El verbo define la intención.',
    summary:
      'El método expresa qué quiere hacer el cliente con el recurso. No es una ruta ni una función del servidor: es la semántica de la operación, y el servidor decide cómo implementarla.',
    points: [
      {
        term: 'GET',
        text: 'Obtiene una representación. Es seguro (no modifica el recurso) y no debería llevar cuerpo.',
      },
      {
        term: 'POST',
        text: 'Crea un recurso o envía datos. No es idempotente: repetirlo puede crear duplicados.',
      },
      {
        term: 'PUT / PATCH',
        text: 'PUT reemplaza el recurso completo y es idempotente. PATCH aplica un cambio parcial.',
      },
      {
        term: 'DELETE / HEAD / OPTIONS',
        text: 'DELETE elimina. HEAD pide solo cabeceras. OPTIONS pregunta qué se puede hacer (clave en CORS).',
      },
    ],
    note: 'Seguro no significa “sin riesgo”: un método seguro no modifica el recurso. La seguridad real depende de HTTPS, autenticación y permisos.',
    codeLabel: 'CRUD con métodos HTTP',
    code: [
      'GET    /api/posts/7      → leer',
      'POST   /api/posts        → crear',
      'PUT    /api/posts/7      → reemplazar',
      'PATCH  /api/posts/7      → modificar',
      'DELETE /api/posts/7      → eliminar',
    ],
    mdn: {
      label: 'Métodos de petición',
      url: 'https://developer.mozilla.org/es/docs/Web/HTTP/Reference/Methods',
    },
  },
  {
    id: 'status',
    n: '04',
    name: 'Códigos de estado',
    tag: 'RESULTADO',
    accent: '#f2a71b',
    angle: 225,
    radius: 27.5,
    icon: 'status',
    headline: 'Un número resume el resultado.',
    summary:
      'El servidor responde con un código de tres cifras. La primera cifra define la clase; las otras dos precisan qué pasó. El texto de razón es informativo, el código es lo que cuenta.',
    points: [
      { term: '1xx · Informativo', text: '100 Continue, 101 Switching Protocols. La petición sigue en curso.' },
      { term: '2xx · Éxito', text: '200 OK, 201 Created, 204 No Content.' },
      { term: '3xx · Redirección', text: '301 Moved Permanently, 304 Not Modified, 307 Temporary Redirect.' },
      { term: '4xx · Error del cliente', text: '400 Bad Request, 401 Unauthorized, 403 Forbidden, 404 Not Found, 429 Too Many Requests.' },
      { term: '5xx · Error del servidor', text: '500 Internal Server Error, 502 Bad Gateway, 503 Service Unavailable.' },
    ],
    note: 'Un 404 no siempre es “culpa del cliente”: puede ser un recurso que ya no existe. Y un 200 no garantiza que el contenido sea correcto.',
    codeLabel: 'Tres respuestas muy distintas',
    code: [
      'HTTP/1.1 301 Moved Permanently',
      'Location: https://example.com/nuevo',
      '',
      'HTTP/1.1 304 Not Modified',
      'ETag: "33a64df5"',
      '',
      'HTTP/1.1 404 Not Found',
      'Content-Type: text/html',
    ],
    mdn: {
      label: 'Códigos de respuesta',
      url: 'https://developer.mozilla.org/es/docs/Web/HTTP/Reference/Status',
    },
  },
  {
    id: 'headers',
    n: '05',
    name: 'Cabeceras',
    tag: 'METADATOS',
    accent: '#0f8f86',
    angle: 270,
    radius: 27.5,
    icon: 'headers',
    headline: 'La parte extensible del protocolo.',
    summary:
      'Las cabeceras son pares nombre-valor que describen la petición, la respuesta, el recurso o la conexión. Gracias a ellas HTTP pudo crecer sin romper lo que ya funcionaba.',
    points: [
      {
        term: 'De petición',
        text: 'Host, User-Agent, Accept, Accept-Language, Authorization, Cookie.',
      },
      {
        term: 'De respuesta',
        text: 'Content-Type, Cache-Control, ETag, Location, Set-Cookie, WWW-Authenticate.',
      },
      {
        term: 'De representación',
        text: 'Describen el cuerpo: Content-Type, Content-Encoding, Content-Language, Content-Length.',
      },
      {
        term: 'Personalizadas',
        text: 'Antes se usaba el prefijo X-. Hoy se recomienda un nombre propio y registrarlo en IANA.',
      },
    ],
    note: 'Los nombres de las cabeceras no distinguen mayúsculas: Content-Type y content-type son exactamente la misma cabecera.',
    codeLabel: 'Cabeceras que cuentan una historia',
    code: [
      'GET /api/me HTTP/1.1',
      'Host: api.example.com',
      'Accept: application/json',
      'Authorization: Bearer eyJhbGciOi...',
      '',
      'HTTP/1.1 200 OK',
      'Content-Type: application/json',
      'Cache-Control: private, max-age=60',
      'ETag: "a91f-42"',
    ],
    mdn: {
      label: 'Cabeceras HTTP',
      url: 'https://developer.mozilla.org/es/docs/Web/HTTP/Reference/Headers',
    },
  },
  {
    id: 'connections',
    n: '06',
    name: 'Conexiones',
    tag: 'EVOLUCIÓN',
    accent: '#d94f8a',
    angle: 315,
    radius: 27.5,
    icon: 'connections',
    headline: 'Menos viajes, más velocidad.',
    summary:
      'HTTP evolucionó para aprovechar mejor cada conexión: de una petición por conexión a la multiplexación sobre TCP y, después, sobre QUIC. HTTPS no es otro protocolo: es HTTP viajando dentro de TLS.',
    points: [
      { term: 'HTTP/1.0', text: 'Una conexión por petición. Cada recurso paga su handshake TCP y TLS.' },
      { term: 'HTTP/1.1', text: 'Conexiones persistentes (keep-alive) y pipelining, pero con bloqueo de cabeza de línea.' },
      { term: 'HTTP/2', text: 'Tramas binarias, multiplexación y compresión HPACK sobre una sola conexión TCP.' },
      { term: 'HTTP/3', text: 'QUIC sobre UDP: multiplexación sin bloqueo de cabeza de línea y 0-RTT.' },
    ],
    note: 'HTTPS cifra la conexión con TLS y usa el puerto 443. Sin TLS, cualquiera en la red puede leer o modificar el mensaje.',
    codeLabel: 'Reutilizar una conexión',
    code: [
      'GET /style.css HTTP/1.1',
      'Host: example.com',
      'Connection: keep-alive',
      '',
      'HTTP/1.1 200 OK',
      'Connection: keep-alive',
      'Keep-Alive: timeout=5, max=1000',
    ],
    mdn: {
      label: 'Evolución de HTTP',
      url: 'https://developer.mozilla.org/es/docs/Web/HTTP/Guides/Evolution_of_HTTP',
    },
  },
  {
    id: 'caching',
    n: '07',
    name: 'Caché y cookies',
    tag: 'MEMORIA',
    accent: '#2f9e63',
    angle: 0,
    radius: 27.5,
    icon: 'cache',
    headline: 'Un protocolo sin estado que recuerda.',
    summary:
      'HTTP no guarda estado entre peticiones, pero la Web necesita recordar. La caché evita viajes repetidos y las cookies transportan estado del cliente entre peticiones.',
    points: [
      { term: 'Cache-Control', text: 'max-age, no-store, no-cache, private/public. La política de caché más importante.' },
      { term: 'Validación', text: 'ETag + If-None-Match: si nada cambió, el servidor responde 304 Not Modified y no reenvía el cuerpo.' },
      { term: 'Cookies', text: 'Set-Cookie en la respuesta, Cookie en la siguiente petición. Viajan solas hacia el mismo dominio.' },
      { term: 'Atributos', text: 'HttpOnly, Secure y SameSite reducen el robo de sesión y los ataques CSRF.' },
    ],
    note: 'Caché no es lo mismo que cookie: la caché guarda respuestas; la cookie guarda estado del cliente. Y ojo: las cookies se envían en cada petición al dominio.',
    codeLabel: 'Guardar y validar',
    code: [
      'HTTP/1.1 200 OK',
      'Cache-Control: public, max-age=3600',
      'ETag: "v42"',
      'Set-Cookie: session=abc123; HttpOnly; Secure; SameSite=Lax',
      '',
      'GET /app.js HTTP/1.1',
      'If-None-Match: "v42"',
      '',
      'HTTP/1.1 304 Not Modified',
    ],
    mdn: {
      label: 'Caché HTTP',
      url: 'https://developer.mozilla.org/es/docs/Web/HTTP/Guides/Caching',
    },
  },
  {
    id: 'cors',
    n: '08',
    name: 'CORS y seguridad',
    tag: 'FRONTERAS',
    accent: '#1f7ae0',
    angle: 45,
    radius: 27.5,
    icon: 'shield',
    headline: 'El navegador vigila las fronteras.',
    summary:
      'El navegador aísla los orígenes: una página no puede leer libremente respuestas de otro dominio. CORS es el mecanismo controlado para permitirlo, y el servidor debe autorizarlo explícitamente.',
    points: [
      { term: 'Origen', text: 'Esquema + host + puerto. https://app.com y https://api.app.com son orígenes distintos.' },
      { term: 'Petición simple', text: 'GET, HEAD o POST con cabeceras limitadas. El navegador envía Origin y valida la respuesta.' },
      { term: 'Preflight', text: 'Para métodos o cabeceras no simples, el navegador pregunta con OPTIONS antes de la petición real.' },
      { term: 'Credenciales', text: 'Con cookies o Authorization, el servidor no puede responder Access-Control-Allow-Origin: *.' },
    ],
    note: 'CORS lo aplica el navegador, no el servidor. No es autenticación: no protege una API de clientes que no sean navegadores.',
    codeLabel: 'Un preflight en dos actos',
    code: [
      'OPTIONS /api/data HTTP/1.1',
      'Origin: https://app.example',
      'Access-Control-Request-Method: PUT',
      '',
      'HTTP/1.1 204 No Content',
      'Access-Control-Allow-Origin: https://app.example',
      'Access-Control-Allow-Methods: GET, PUT',
      'Access-Control-Allow-Headers: Content-Type',
    ],
    mdn: {
      label: 'Intercambio de recursos de origen cruzado',
      url: 'https://developer.mozilla.org/es/docs/Web/HTTP/Guides/CORS',
    },
  },
];

export const TOTAL_CONCEPTS = STATIONS.length;
