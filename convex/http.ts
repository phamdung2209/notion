import { httpAction } from "./_generated/server";
import { auth } from "./auth";
import router from "./router";

const http = router;

auth.addHttpRoutes(http);

http.route({
  path: "/test",
  method: "GET",
  handler: httpAction(async (ctx, req) => {
    return new Response(
      JSON.stringify({
        message: "Hello from Convex HTTP endpoint!",
        time: new Date().toISOString(),
      }),
      {
        headers: { "Content-Type": "application/json" },
      }
    );
  }),
});

export default http;
