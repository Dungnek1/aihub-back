import { PrismaClient } from '@prisma/client';

export async function seedTools(db: any, priceIds: any) {
  console.log('🛠️  Seeding AI Tools...');

  const tools = await db.aiTool.createMany({
    data: [
      {
        name: 'ChatGPT 5.0',
        description: 'AI chatbot developed by OpenAI for conversational interactions',
        slug: 'chatgpt-5',
        homepageUrl: 'https://chat.openai.com/',
        logoUrl: 'image/tool/user-default-1762061547207.jpg',
        shortDesc: 'Conversational AI assistant powered by GPT models',
        longDesc: 'ChatGPT is an AI language model developed by OpenAI that can engage in human-like conversations, answer questions, and assist with various tasks.',
        priceId: priceIds.freemium,
        status: 1,
        bodyHtml: `
          <div class="tool-description">
            <h2>About ChatGPT</h2>
            <p>ChatGPT is an advanced AI chatbot developed by OpenAI, based on the GPT (Generative Pre-trained Transformer) architecture. It's designed to understand and generate human-like text, making it an excellent tool for conversation, content creation, and problem-solving.</p>

            <h3>Key Features</h3>
            <ul>
              <li><strong>Conversational AI:</strong> Engage in natural, human-like conversations</li>
              <li><strong>Multi-language Support:</strong> Communicate in multiple languages</li>
              <li><strong>Code Generation:</strong> Help with programming and code writing</li>
              <li><strong>Content Creation:</strong> Assist in writing articles, emails, and creative content</li>
              <li><strong>Learning Tool:</strong> Explain complex topics in simple terms</li>
            </ul>

            <h3>Use Cases</h3>
            <p>ChatGPT is widely used for:</p>
            <ul>
              <li>Customer service automation</li>
              <li>Educational assistance</li>
              <li>Content generation</li>
              <li>Programming help</li>
              <li>Language translation</li>
              <li>Brainstorming ideas</li>
            </ul>

            <h3>Pricing</h3>
            <p>ChatGPT offers both free and premium tiers. The free version provides access to GPT-3.5, while ChatGPT Plus subscribers get access to GPT-4 with enhanced capabilities.</p>
          </div>
        `,
        createdBy: 'admin-1',
      },
      {
        name: 'Gemini',
        description: 'Google\'s multimodal AI model for text, images, and more',
        slug: 'gemini',
        homepageUrl: 'https://gemini.google.com/',
        logoUrl: 'image/tool/user-default-1762061547207.jpg',
        shortDesc: 'Google\'s advanced AI model with multimodal capabilities',
        longDesc: 'Gemini is Google\'s latest AI model that can understand and generate content across multiple modalities including text, images, audio, and video.',
        priceId: priceIds.free,
        status: 1,
        bodyHtml: `
          <div class="tool-description">
            <h2>About Gemini</h2>
            <p>Gemini is Google's cutting-edge AI model that represents a significant advancement in artificial intelligence. Unlike previous models that were limited to text, Gemini can understand and generate content across multiple modalities - text, images, audio, and even video.</p>

            <h3>Key Features</h3>
            <ul>
              <li><strong>Multimodal Understanding:</strong> Process text, images, and other media types</li>
              <li><strong>Advanced Reasoning:</strong> Complex problem-solving capabilities</li>
              <li><strong>Real-time Processing:</strong> Fast response times for interactive applications</li>
              <li><strong>Integration:</strong> Seamlessly works with Google Workspace and other tools</li>
              <li><strong>Safety Focus:</strong> Built-in safety measures and responsible AI practices</li>
            </ul>

            <h3>Use Cases</h3>
            <p>Gemini excels in:</p>
            <ul>
              <li>Image analysis and description</li>
              <li>Multilingual communication</li>
              <li>Creative content generation</li>
              <li>Educational applications</li>
              <li>Business intelligence</li>
              <li>Scientific research assistance</li>
            </ul>

            <h3>Availability</h3>
            <p>Gemini is available through various Google services and platforms, with both free and enterprise options depending on usage requirements.</p>
          </div>
        `,
        createdBy: 'admin-1',
      },
      {
        name: 'DALL-E',
        description: 'AI image generation tool by OpenAI',
        slug: 'dall-e',
        homepageUrl: 'https://openai.com/dall-e-3/',
        logoUrl: 'image/tool/user-default-1762061547207.jpg',
        shortDesc: 'Create images from text descriptions using AI',
        longDesc: 'DALL-E is an AI system developed by OpenAI that can generate realistic images and art from natural language descriptions.',
        priceId: priceIds.paid,
        status: 1,
        bodyHtml: `
          <div class="tool-description">
            <h2>About DALL-E</h2>
            <p>DALL-E is OpenAI's revolutionary AI image generation system that can create stunning, realistic images from simple text descriptions. Named after the artist Salvador Dalí and the character WALL-E, it represents a breakthrough in AI's ability to understand and visualize concepts.</p>

            <h3>Key Features</h3>
            <ul>
              <li><strong>Text-to-Image:</strong> Generate images from detailed text prompts</li>
              <li><strong>High Quality:</strong> Produce photorealistic and artistic images</li>
              <li><strong>Style Control:</strong> Specify artistic styles and aesthetics</li>
              <li><strong>Variations:</strong> Create multiple versions of the same concept</li>
              <li><strong>Editing:</strong> Modify existing images with AI assistance</li>
            </ul>

            <h3>Use Cases</h3>
            <p>DALL-E is perfect for:</p>
            <ul>
              <li>Digital art creation</li>
              <li>Marketing and advertising visuals</li>
              <li>Concept visualization</li>
              <li>Educational illustrations</li>
              <li>Game design assets</li>
              <li>Social media content</li>
            </ul>

            <h3>Latest Version</h3>
            <p>DALL-E 3 offers improved image quality, better prompt understanding, and enhanced safety features compared to previous versions.</p>
          </div>
        `,
        createdBy: 'admin-1',
      },
      {
        name: 'Midjourney',
        description: 'AI-powered image generation for creative professionals',
        slug: 'midjourney',
        homepageUrl: 'https://www.midjourney.com/',
        logoUrl: 'image/tool/user-default-1762061547207.jpg',
        shortDesc: 'Create stunning AI-generated artwork and images',
        longDesc: 'Midjourney is an AI-powered tool that generates images from text descriptions, known for its artistic and creative output.',
        priceId: priceIds.subscription,
        status: 1,
        bodyHtml: `
          <div class="tool-description">
            <h2>About Midjourney</h2>
            <p>Midjourney is an independent AI research company that has developed one of the most popular AI image generation tools. Unlike other AI image generators, Midjourney is particularly known for its artistic and creative output, often producing images with a distinctive artistic flair.</p>

            <h3>Key Features</h3>
            <ul>
              <li><strong>Artistic Style:</strong> Unique artistic interpretation of prompts</li>
              <li><strong>Discord Integration:</strong> Operates primarily through Discord</li>
              <li><strong>Community:</strong> Large community of artists and creators</li>
              <li><strong>High Resolution:</strong> Generate images up to 2048x2048 pixels</li>
              <li><strong>Variations:</strong> Create multiple interpretations of the same prompt</li>
            </ul>

            <h3>Use Cases</h3>
            <p>Midjourney is ideal for:</p>
            <ul>
              <li>Digital art and illustration</li>
              <li>Concept art for games and films</li>
              <li>Marketing visuals</li>
              <li>Fashion design</li>
              <li>Architectural visualization</li>
              <li>Creative experimentation</li>
            </ul>

            <h3>Community Aspect</h3>
            <p>One of Midjourney's strengths is its active Discord community where users share prompts, techniques, and collaborate on creative projects.</p>
          </div>
        `,
        createdBy: 'admin-1',
      },
      {
        name: 'Claude',
        description: 'AI assistant by Anthropic focused on safety and helpfulness',
        slug: 'claude',
        homepageUrl: 'https://www.anthropic.com/claude',
        logoUrl: 'image/tool/user-default-1762061547207.jpg',
        shortDesc: 'Safe and helpful AI assistant with strong reasoning capabilities',
        longDesc: 'Claude is an AI assistant developed by Anthropic, designed to be helpful, honest, and safe while maintaining strong performance across various tasks.',
        priceId: priceIds.freemium,
        status: 1,
        bodyHtml: `
          <div class="tool-description">
            <h2>About Claude</h2>
            <p>Claude is an AI assistant developed by Anthropic, a company founded by former OpenAI researchers. Unlike other AI models, Claude is specifically designed with safety and ethical considerations at its core, while still maintaining impressive capabilities in reasoning, analysis, and creative tasks.</p>

            <h3>Key Features</h3>
            <ul>
              <li><strong>Safety-First Design:</strong> Built with constitutional AI principles</li>
              <li><strong>Long Context:</strong> Can process up to 100,000 tokens</li>
              <li><strong>Honest Responses:</strong> Designed to be maximally truthful</li>
              <li><strong>Helpful Analysis:</strong> Strong capabilities in research and analysis</li>
              <li><strong>Creative Writing:</strong> Excellent at generating creative content</li>
            </ul>

            <h3>Use Cases</h3>
            <p>Claude excels in:</p>
            <ul>
              <li>Research and analysis</li>
              <li>Creative writing and content creation</li>
              <li>Code review and programming assistance</li>
              <li>Educational explanations</li>
              <li>Business strategy and planning</li>
              <li>Ethical decision-making support</li>
            </ul>

            <h3>Constitutional AI</h3>
            <p>Anthropic's approach to AI development emphasizes creating AI systems that are aligned with human values and can explain their reasoning, making Claude particularly suitable for sensitive applications.</p>
          </div>
        `,
        createdBy: 'admin-1',
      },
      {
        name: 'GitHub Copilot',
        description: 'AI-powered code completion and assistance tool for developers',
        slug: 'github-copilot',
        homepageUrl: 'https://github.com/features/copilot',
        logoUrl: 'image/tool/user-default-1762061547207.jpg',
        shortDesc: 'AI pair programmer that helps write code faster',
        longDesc: 'GitHub Copilot is an AI-powered code completion tool developed by GitHub and OpenAI that suggests code and entire functions in real-time.',
        priceId: priceIds.subscription,
        status: 1,
        bodyHtml: `
          <div class="tool-description">
            <h2>About GitHub Copilot</h2>
            <p>GitHub Copilot is an AI-powered code completion tool that serves as an AI pair programmer. Developed through a collaboration between GitHub and OpenAI, it uses the GPT-3.5 and GPT-4 models to provide intelligent code suggestions, helping developers write code faster and more efficiently.</p>

            <h3>Key Features</h3>
            <ul>
              <li><strong>Code Completion:</strong> Suggests code snippets and entire functions</li>
              <li><strong>Multi-language Support:</strong> Works with numerous programming languages</li>
              <li><strong>Context Awareness:</strong> Understands project context and coding patterns</li>
              <li><strong>Real-time Suggestions:</strong> Provides suggestions as you type</li>
              <li><strong>IDE Integration:</strong> Available in Visual Studio Code and other popular editors</li>
            </ul>

            <h3>Use Cases</h3>
            <p>GitHub Copilot is perfect for:</p>
            <ul>
              <li>Accelerating development speed</li>
              <li>Learning new programming languages</li>
              <li>Reducing repetitive coding tasks</li>
              <li>Exploring new APIs and libraries</li>
              <li>Code refactoring and optimization</li>
              <li>Writing unit tests and documentation</li>
            </ul>

            <h3>Supported Languages</h3>
            <p>Copilot supports a wide range of programming languages including Python, JavaScript, TypeScript, Java, C++, Go, Ruby, PHP, and many more.</p>
          </div>
        `,
        createdBy: 'admin-1',
      },
      {
        name: 'Stable Diffusion',
        description: 'Open-source AI image generation model for creating high-quality images',
        slug: 'stable-diffusion',
        homepageUrl: 'https://stability.ai/',
        logoUrl: 'image/tool/user-default-1762061547207.jpg',
        shortDesc: 'Open-source AI for generating and manipulating images',
        longDesc: 'Stable Diffusion is an open-source AI model developed by Stability AI that can generate detailed images from text descriptions and perform various image manipulation tasks.',
        priceId: priceIds.free,
        status: 1,
        bodyHtml: `
          <div class="tool-description">
            <h2>About Stable Diffusion</h2>
            <p>Stable Diffusion is a revolutionary open-source AI model for image generation and manipulation. Developed by Stability AI, it represents a significant advancement in AI's ability to create and modify images based on text descriptions. Unlike proprietary models, Stable Diffusion is freely available for anyone to use and modify.</p>

            <h3>Key Features</h3>
            <ul>
              <li><strong>Open Source:</strong> Freely available for research and commercial use</li>
              <li><strong>High Quality Output:</strong> Generates detailed, realistic images</li>
              <li><strong>Image-to-Image:</strong> Transform existing images with AI</li>
              <li><strong>Inpainting:</strong> Fill in missing parts of images intelligently</li>
              <li><strong>Customization:</strong> Fine-tune models for specific styles or subjects</li>
            </ul>

            <h3>Use Cases</h3>
            <p>Stable Diffusion excels in:</p>
            <ul>
              <li>Digital art creation</li>
              <li>Concept art and visualization</li>
              <li>Product design prototyping</li>
              <li>Educational illustrations</li>
              <li>Photography enhancement</li>
              <li>Creative experimentation</li>
            </ul>

            <h3>Community</h3>
            <p>The Stable Diffusion community has created thousands of custom models and tools, making it one of the most versatile AI image generation platforms available.</p>
          </div>
        `,
        createdBy: 'admin-1',
      },
      {
        name: 'Perplexity AI',
        description: 'AI-powered search engine that provides comprehensive answers with sources',
        slug: 'perplexity-ai',
        homepageUrl: 'https://www.perplexity.ai/',
        logoUrl: 'image/tool/user-default-1762061547207.jpg',
        shortDesc: 'AI search engine with real-time, sourced answers',
        longDesc: 'Perplexity AI is an AI-powered search engine that provides comprehensive, sourced answers to questions, combining the best of search engines and AI chatbots.',
        priceId: priceIds.freemium,
        status: 1,
        bodyHtml: `
          <div class="tool-description">
            <h2>About Perplexity AI</h2>
            <p>Perplexity AI is an innovative search engine that leverages artificial intelligence to provide comprehensive, well-sourced answers to user queries. Unlike traditional search engines that return lists of links, Perplexity AI delivers direct answers with citations, making research faster and more efficient.</p>

            <h3>Key Features</h3>
            <ul>
              <li><strong>Sourced Answers:</strong> Every answer includes references and sources</li>
              <li><strong>Real-time Information:</strong> Access to current events and data</li>
              <li><strong>Conversational Interface:</strong> Natural language queries and follow-ups</li>
              <li><strong>Multi-modal Search:</strong> Search across text, images, and videos</li>
              <li><strong>Focus Mode:</strong> Specialized search for different topics</li>
            </ul>

            <h3>Use Cases</h3>
            <p>Perplexity AI is ideal for:</p>
            <ul>
              <li>Academic research</li>
              <li>Current events tracking</li>
              <li>Fact-checking</li>
              <li>Learning new topics</li>
              <li>Professional research</li>
              <li>Staying informed about industry trends</li>
            </ul>

            <h3>Focus Modes</h3>
            <p>Perplexity offers specialized focus modes for different types of searches, including Academic, Writing, Coding, and more, each optimized for specific use cases.</p>
          </div>
        `,
        createdBy: 'admin-1',
      },
      {
        name: 'Jasper',
        description: 'AI writing assistant for creating high-quality content at scale',
        slug: 'jasper',
        homepageUrl: 'https://www.jasper.ai/',
        logoUrl: 'image/tool/user-default-1762061547207.jpg',
        shortDesc: 'AI content creation tool for marketing and business writing',
        longDesc: 'Jasper is an AI writing assistant designed specifically for marketing and business content creation, helping users generate high-quality copy quickly and efficiently.',
        priceId: priceIds.subscription,
        status: 1,
        bodyHtml: `
          <div class="tool-description">
            <h2>About Jasper</h2>
            <p>Jasper is an AI-powered writing assistant specifically designed for marketing and business professionals. It helps users create high-quality content at scale, from blog posts and social media updates to marketing copy and business communications. Jasper combines advanced AI with marketing expertise to produce compelling, conversion-focused content.</p>

            <h3>Key Features</h3>
            <ul>
              <li><strong>Marketing-Focused:</strong> Specialized for business and marketing content</li>
              <li><strong>Brand Voice:</strong> Maintain consistent brand tone and style</li>
              <li><strong>Multi-format Support:</strong> Generate various content types</li>
              <li><strong>SEO Optimization:</strong> Built-in SEO best practices</li>
              <li><strong>Team Collaboration:</strong> Share and collaborate on content</li>
            </ul>

            <h3>Use Cases</h3>
            <p>Jasper is perfect for:</p>
            <ul>
              <li>Blog post creation</li>
              <li>Social media content</li>
              <li>Email marketing campaigns</li>
              <li>Website copy</li>
              <li>Product descriptions</li>
              <li>Ad copy and landing pages</li>
            </ul>

            <h3>Content Types</h3>
            <p>Jasper supports over 50 content types including blog posts, social media posts, emails, ads, product descriptions, and more, each with specialized templates and prompts.</p>
          </div>
        `,
        createdBy: 'admin-1',
      },
      {
        name: 'Character.AI',
        description: 'AI platform for creating and interacting with AI characters',
        slug: 'character-ai',
        homepageUrl: 'https://character.ai/',
        logoUrl: 'image/tool/user-default-1762061547207.jpg',
        shortDesc: 'Create and chat with AI characters in any scenario',
        longDesc: 'Character.AI is a platform that allows users to create and interact with AI-powered characters, enabling immersive conversations and role-playing experiences.',
        priceId: priceIds.freemium,
        status: 1,
        bodyHtml: `
          <div class="tool-description">
            <h2>About Character.AI</h2>
            <p>Character.AI is an innovative platform that allows users to create and interact with AI-powered characters. Whether you want to chat with historical figures, fictional characters, or create your own custom personalities, Character.AI provides an immersive conversational experience powered by advanced language models.</p>

            <h3>Key Features</h3>
            <ul>
              <li><strong>Character Creation:</strong> Design custom AI characters with unique personalities</li>
              <li><strong>Pre-made Characters:</strong> Chat with popular characters created by the community</li>
              <li><strong>Role-playing:</strong> Engage in immersive role-playing scenarios</li>
              <li><strong>Memory System:</strong> Characters remember past conversations</li>
              <li><strong>Community Sharing:</strong> Share and discover characters created by others</li>
            </ul>

            <h3>Use Cases</h3>
            <p>Character.AI is great for:</p>
            <ul>
              <li>Entertainment and role-playing</li>
              <li>Language learning</li>
              <li>Creative writing inspiration</li>
              <li>Educational conversations</li>
              <li>Social interaction</li>
              <li>Exploring different perspectives</li>
            </ul>

            <h3>Safety and Moderation</h3>
            <p>Character.AI implements comprehensive safety measures and content moderation to ensure positive and appropriate interactions for all users.</p>
          </div>
        `,
        createdBy: 'admin-1',
      },
    ],
    skipDuplicates: true,
  });

  console.log(`✅ Created ${tools.count} AI tools`);
}