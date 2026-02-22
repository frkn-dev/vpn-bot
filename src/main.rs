use std::env;
use teloxide::prelude::*;
use teloxide::types::InputFile;

#[tokio::main]
async fn main() {
    dotenvy::dotenv().ok();
    pretty_env_logger::init();
    log::info!("Starting FRKN bot...");

    let bot = Bot::from_env();

    teloxide::repl(bot, |bot: Bot, msg: Message| async move {
        let chat_id = msg.chat.id;

        let text = "Вся инфа https://frkn.org или в канале @frkn_org";

        bot.send_message(chat_id, text).await?;

        bot.send_video(chat_id, InputFile::file("video.mp4"))
            .await?;

        respond(())
    })
    .await;
}
