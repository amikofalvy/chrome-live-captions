# chrome-live-captions
Live Caption extension for Google Chrome which allows you to transcribe any audio being played from the browser in real-time.

Forked from: https://github.com/arblast/Chrome-Audio-Capturer

Demo: https://www.loom.com/share/7bd42423c93a4c51bf27b03a7957e8a9

## Inspiration
For the deaf and hard of hearing community, inaccessible audio content is entirely unavailable unless it is explicitly made accessible. Additionally accessible content is a boon for the entire community providing benefits like improved information comprehension, improved automation/testing, and indexing audio content into text search engines.

Many of us have a relative who is hard of hearing. I have witnessed the frustration and confusion resulting from a lack of accessible content. While hearing aide technology exists to make improvements to general audio, hearing aid technology is not perfect and often fails when there is background noise or on audios of certain frequencies or qualities like those coming from a laptop speaker. Because hearing aide tech has deficiencies or not usable for those with more advanced hearing loss, it is useful to augment audio with have visual assistance such as captions.

Luckily, some services provide captions for their audio/video content and providing them is becoming ever more popular. Recently, we've seen news about [AMC starting to show captioned screenings](https://www.npr.org/2021/10/21/1048017853/amc-theatres-open-captioning-movie-accessibility), or communications tools like [Zoom](https://www.theverge.com/2021/10/25/22744704/zoom-auto-generated-captions-available-free-accounts-accessibility) and [Slack](https://slack.com/help/articles/4402059015315-Start-a-huddle-in-a-channel-or-direct-message#:~:text=To%20turn%20on%20live%20captioning) and social media sites like [TikTok](https://www.businessinsider.com/tiktok-captions) and [Youtube](https://support.google.com/youtube/answer/6373554?hl=en) that are making caption functionality free for all users. 

Still though, there is a problem, many consumers are relying on the content creators to provide captions, but not all content creators are making captions a priority.

I hope to empower the consumers to patch the accessibility gaps with this chrome extension.

## What it does
This chrome extension can be installed in the chrome browser. When a user wants to live caption their content they can invoke the chrome extension from the extension toolbar. Invoking the extension starts capturing audio from the active chrome tab. The audio stream is sent to rev.ai's real-time websocket api for transcription. The transcript elements are received over the same websocket connection and displayed in the overlay UI element. The UI element can be moved around the screen to be positioned in a way that it does not cover important visual content.

## How we built it
There were two major technologies used in the building of this product:

* [Rev.ai API](https://rev.ai) for high accuracy transcription, including punctuation and capitalization.
* Chrome Extension API
* Forked [Chrome Audio Capturer](https://github.com/arblast/Chrome-Audio-Capturer) as a basic chrome extension skeleton for capturing audio from chrome

## Challenges we ran into
* Rev.ai API was hassle free. There was a simple websocket protocol that is well documented with useful examples. There was a nodejs sdk as well, but I opted to go for a vanilla js route.
* Most of the challenges were in finding the right resources to build a working chrome extension. Chrome Extension development is new to me and it looks like the extension developer community is in-between a v2 and v3. I found

## Accomplishments that we're proud of
The first iteration came together very quickly because of the existence of the existing chrome audio capture extension the second iteration is well underway and development continues to bring this as a polished utility. Most importantly, this utility is immediately functional, even in it's unpolished state.

## What we learned
* Developing accessible content is not as difficult as it seems. With modern automatic speech recognition and low-cost APIs available it's possible to make content accessible.
* I did test other speech recognition engines as well. I know that Chrome's WebSpeech API defaults to using google's recognition. I preferred rev.ai's output because of the way it added punctuation to the text and subjectively, I felt it had a higher accuracy in the types of content I was watching.
* There is existing functionality in chrome that lets you do something similar, but it does not allow you to copy and paste text from it. I think the ability to save transcripts is a useful feature that I would like to implement in a future iteration.

## What's next for Live Caption Everything
I have a long list of ideas to improve this chrome extension, both features and technical debts.

Features:

* Improved User Interface: Update the UI to make the caption element configurable by being able to change things like the font, color, contrast, and size. I liked https://webcaptioner.com/ for inspiration on what a fully featured caption setup could look like. I'd like to bring the same high level of configuration to the native browsing experience.
* The ability to save audio/text transcript to local file for later reference
* Real-time translation

Technical Debt:
* In the future, I plan to upgrade the chrome extension manifest to V3 to take advantage of the modern frameworks like service workers in the enhanced security permissions described in the V3 migration document. This effort is already well underway, but I need to spend more time researching Chrome Extension best practices to make this production ready.


