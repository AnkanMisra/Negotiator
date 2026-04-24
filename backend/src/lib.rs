use worker::{event, Context, Env, Request, Response, Result, Router};

mod error;
mod handlers;
mod types;

#[event(fetch)]
async fn main(req: Request, env: Env, _ctx: Context) -> Result<Response> {
    console_error_panic_hook::set_once();

    Router::new()
        .get("/", |_, _| Response::ok("The Negotiator — OK"))
        .post_async("/negotiate", handlers::negotiate)
        .post_async("/voice", handlers::voice)
        .run(req, env)
        .await
}
