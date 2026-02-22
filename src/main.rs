use std::env;
use teloxide::prelude::*;
use teloxide::types::InputFile;

#[tokio::main]
async fn main() {
    println!("=== BOT STARTING ===");
    println!(
        "1. Current directory: {:?}",
        std::env::current_dir().unwrap_or_default()
    );

    match dotenvy::dotenv() {
        Ok(_) => println!("2. .env file loaded successfully"),
        Err(e) => println!("2. Failed to load .env file: {}", e),
    }

    match env::var("TELOXIDE_TOKEN") {
        Ok(token) => println!("3. Token found! Length: {}", token.len()),
        Err(_) => println!("3. ERROR: TELOXIDE_TOKEN not set!"),
    }

    println!("4. Setting up logger...");
    env::set_var("RUST_LOG", "info");
    pretty_env_logger::init();

    println!("5. Logger initialized, trying log::info...");
    log::info!("Starting FRKN bot...");
    println!("6. log::info called successfully");

    println!("7. Creating bot...");
    let bot = Bot::from_env();
    println!("8. Bot created successfully");

    println!("9. Checking video.mp4...");
    if std::path::Path::new("video.mp4").exists() {
        println!("10. video.mp4 found");
    } else {
        println!("10. WARNING: video.mp4 not found!");
    }

    println!("11. Starting REPL...");

    teloxide::repl(bot, |bot: Bot, msg: Message| async move {
        println!("=== MESSAGE RECEIVED ===");
        println!("Chat ID: {:?}", msg.chat.id);

        let chat_id = msg.chat.id;
        let text = "Вся инфа https://frkn.org или в канале @frkn_org";

        match bot.send_message(chat_id, text).await {
            Ok(_) => println!("Message sent successfully"),
            Err(e) => println!("ERROR sending message: {}", e),
        }

        if std::path::Path::new("video.mp4").exists() {
            match bot.send_video(chat_id, InputFile::file("video.mp4")).await {
                Ok(_) => println!("Video sent successfully"),
                Err(e) => println!("ERROR sending video: {}", e),
            }
        } else {
            println!("Skipping video - file not found");
        }

        respond(())
    })
    .await;
}
