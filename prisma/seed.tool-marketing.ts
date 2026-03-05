import { PrismaClient } from '@prisma/client';

export async function seedToolMarketings(db: any, priceIds: any, adminUserId: string) {
  console.log('📢 Seeding Tool Marketings...');

  const toolMarketings = [
    {
      title: 'ChatGPT Mastery - Tối ưu hóa công việc với AI',
      shortDesc: 'Học cách sử dụng ChatGPT hiệu quả để tăng năng suất làm việc và sáng tạo nội dung',
      description: 'Khóa học này sẽ dạy bạn cách tận dụng tối đa sức mạnh của ChatGPT trong công việc hàng ngày. Từ viết content, lập trình, đến phân tích dữ liệu.',
      slug: 'chatgpt-mastery-toi-uu-hoa-cong-viec-voi-ai',
      priceId: priceIds.freemium,
      status: 'PUBLIC' as const,
      isFeatured: true,
      bodyHtml: `
        <div class="tool-marketing-content">
          <h2>ChatGPT - Công cụ AI mạnh mẽ nhất</h2>
          <p>ChatGPT đã cách mạng hóa cách chúng ta làm việc và sáng tạo. Khóa học này sẽ giúp bạn thành thạo ChatGPT.</p>
          
          <h3>Bạn sẽ học được</h3>
          <ul>
            <li>Prompt engineering techniques</li>
            <li>Content creation với ChatGPT</li>
            <li>Code generation và debugging</li>
            <li>Data analysis và research</li>
            <li>Business automation</li>
          </ul>
        </div>
      `,
      viewsCount: 3200,
      reactionsCount: 245,
      sharesCount: 128,
      commentsCount: 67,
      avgRating: 4.8,
      ratingsCount: 156,
    },
    {
      title: 'Midjourney - Tạo nghệ thuật AI chuyên nghiệp',
      shortDesc: 'Học cách tạo hình ảnh nghệ thuật đẹp mắt với Midjourney AI',
      description: 'Khóa học Midjourney giúp bạn tạo ra những tác phẩm nghệ thuật tuyệt đẹp với AI. Học các kỹ thuật prompt, style mixing và image refinement.',
      slug: 'midjourney-tao-nghe-thuat-ai-chuyen-nghiep',
      priceId: priceIds.subscription,
      status: 'PUBLIC' as const,
      isFeatured: true,
      bodyHtml: `
        <div class="tool-marketing-content">
          <h2>Midjourney Art Generation</h2>
          <p>Tạo nghệ thuật AI chuyên nghiệp với Midjourney.</p>
          
          <h3>Nội dung</h3>
          <ul>
            <li>Midjourney basics và setup</li>
            <li>Advanced prompting techniques</li>
            <li>Style và composition</li>
            <li>Image refinement và upscaling</li>
            <li>Commercial use cases</li>
          </ul>
        </div>
      `,
      viewsCount: 2800,
      reactionsCount: 198,
      sharesCount: 102,
      commentsCount: 54,
      avgRating: 4.7,
      ratingsCount: 134,
    },
    {
      title: 'Notion AI - Quản lý công việc thông minh',
      shortDesc: 'Tối ưu hóa workflow với Notion AI và automation',
      description: 'Học cách sử dụng Notion AI để quản lý dự án, ghi chú và tự động hóa công việc. Tạo workspace hiệu quả với AI-powered features.',
      slug: 'notion-ai-quan-ly-cong-viec-thong-minh',
      priceId: priceIds.freemium,
      status: 'PUBLIC' as const,
      isFeatured: false,
      bodyHtml: `
        <div class="tool-marketing-content">
          <h2>Notion AI Workspace</h2>
          <p>Biến Notion thành trung tâm quản lý công việc của bạn.</p>
          
          <h3>Bạn sẽ học</h3>
          <ul>
            <li>Notion AI features</li>
            <li>Database và templates</li>
            <li>Automation và workflows</li>
            <li>Team collaboration</li>
          </ul>
        </div>
      `,
      viewsCount: 1650,
      reactionsCount: 112,
      sharesCount: 58,
      commentsCount: 31,
      avgRating: 4.5,
      ratingsCount: 72,
    },
    {
      title: 'GitHub Copilot - Lập trình nhanh hơn với AI',
      shortDesc: 'Tăng tốc độ coding với GitHub Copilot và AI pair programming',
      description: 'Khóa học GitHub Copilot giúp bạn code nhanh hơn và hiệu quả hơn. Học cách sử dụng AI để generate code, debug và refactor.',
      slug: 'github-copilot-lap-trinh-nhanh-hon-voi-ai',
      priceId: priceIds.subscription,
      status: 'PUBLIC' as const,
      isFeatured: true,
      bodyHtml: `
        <div class="tool-marketing-content">
          <h2>AI Pair Programming</h2>
          <p>GitHub Copilot là AI coding assistant mạnh mẽ nhất hiện nay.</p>
          
          <h3>Nội dung</h3>
          <ul>
            <li>GitHub Copilot setup và configuration</li>
            <li>Code generation techniques</li>
            <li>Best practices và tips</li>
            <li>Integration với IDEs</li>
            <li>Advanced features</li>
          </ul>
        </div>
      `,
      viewsCount: 2400,
      reactionsCount: 178,
      sharesCount: 89,
      commentsCount: 47,
      avgRating: 4.6,
      ratingsCount: 108,
    },
    {
      title: 'Canva AI - Thiết kế đồ họa dễ dàng',
      shortDesc: 'Tạo designs chuyên nghiệp với Canva AI và Magic Design',
      description: 'Học cách sử dụng Canva AI để tạo designs đẹp mắt mà không cần kỹ năng thiết kế. Từ social media posts đến presentations.',
      slug: 'canva-ai-thiet-ke-do-hoa-de-dang',
      priceId: priceIds.freemium,
      status: 'PUBLIC' as const,
      isFeatured: false,
      bodyHtml: `
        <div class="tool-marketing-content">
          <h2>Canva AI Design</h2>
          <p>Thiết kế chuyên nghiệp với AI assistance.</p>
          
          <h3>Bạn sẽ học</h3>
          <ul>
            <li>Canva AI features</li>
            <li>Magic Design và templates</li>
            <li>Brand kit và consistency</li>
            <li>Animation và video</li>
          </ul>
        </div>
      `,
      viewsCount: 1950,
      reactionsCount: 134,
      sharesCount: 67,
      commentsCount: 35,
      avgRating: 4.5,
      ratingsCount: 81,
    },
    {
      title: 'Jasper AI - Content Marketing tự động',
      shortDesc: 'Tạo content marketing chất lượng với Jasper AI',
      description: 'Khóa học Jasper AI giúp bạn tạo content marketing hiệu quả. Học cách viết blog posts, social media content, và email campaigns với AI.',
      slug: 'jasper-ai-content-marketing-tu-dong',
      priceId: priceIds.subscription,
      status: 'PUBLIC' as const,
      isFeatured: false,
      bodyHtml: `
        <div class="tool-marketing-content">
          <h2>AI Content Marketing</h2>
          <p>Jasper AI giúp bạn tạo content nhanh và chất lượng.</p>
          
          <h3>Nội dung</h3>
          <ul>
            <li>Jasper AI templates</li>
            <li>Content writing workflows</li>
            <li>SEO optimization</li>
            <li>Brand voice và tone</li>
          </ul>
        </div>
      `,
      viewsCount: 1420,
      reactionsCount: 98,
      sharesCount: 49,
      commentsCount: 26,
      avgRating: 4.4,
      ratingsCount: 63,
    },
    {
      title: 'Runway ML - Video Editing với AI',
      shortDesc: 'Chỉnh sửa video chuyên nghiệp với AI-powered tools',
      description: 'Học cách sử dụng Runway ML để chỉnh sửa video với AI. Từ background removal đến video generation, tất cả đều được tự động hóa.',
      slug: 'runway-ml-video-editing-voi-ai',
      priceId: priceIds.paid,
      status: 'PUBLIC' as const,
      isFeatured: true,
      bodyHtml: `
        <div class="tool-marketing-content">
          <h2>AI Video Editing</h2>
          <p>Runway ML mang AI vào video editing workflow.</p>
          
          <h3>Features</h3>
          <ul>
            <li>AI video generation</li>
            <li>Background removal</li>
            <li>Object tracking</li>
            <li>Color grading với AI</li>
          </ul>
        </div>
      `,
      viewsCount: 2100,
      reactionsCount: 156,
      sharesCount: 78,
      commentsCount: 41,
      avgRating: 4.7,
      ratingsCount: 95,
    },
    {
      title: 'Claude AI - Research và Analysis chuyên sâu',
      shortDesc: 'Sử dụng Claude AI cho research, analysis và writing',
      description: 'Khóa học Claude AI giúp bạn tận dụng khả năng phân tích và research của Claude. Học cách sử dụng Claude cho academic research và business analysis.',
      slug: 'claude-ai-research-va-analysis-chuyen-sau',
      priceId: priceIds.freemium,
      status: 'PUBLIC' as const,
      isFeatured: false,
      bodyHtml: `
        <div class="tool-marketing-content">
          <h2>Claude AI Research</h2>
          <p>Claude là AI assistant mạnh mẽ cho research và analysis.</p>
          
          <h3>Use cases</h3>
          <ul>
            <li>Academic research</li>
            <li>Business analysis</li>
            <li>Long-form writing</li>
            <li>Code analysis</li>
          </ul>
        </div>
      `,
      viewsCount: 1750,
      reactionsCount: 123,
      sharesCount: 62,
      commentsCount: 33,
      avgRating: 4.6,
      ratingsCount: 74,
    },
    {
      title: 'Figma AI - Design automation',
      shortDesc: 'Tự động hóa design workflow với Figma AI plugins',
      description: 'Học cách sử dụng AI plugins trong Figma để tăng tốc design process. Từ auto-layout đến content generation.',
      slug: 'figma-ai-design-automation',
      priceId: priceIds.subscription,
      status: 'PUBLIC' as const,
      isFeatured: false,
      bodyHtml: `
        <div class="tool-marketing-content">
          <h2>Figma AI Plugins</h2>
          <p>Tự động hóa design với AI trong Figma.</p>
          
          <h3>Nội dung</h3>
          <ul>
            <li>Figma AI plugins</li>
            <li>Auto-layout và components</li>
            <li>Content generation</li>
            <li>Design system automation</li>
          </ul>
        </div>
      `,
      viewsCount: 1280,
      reactionsCount: 87,
      sharesCount: 43,
      commentsCount: 23,
      avgRating: 4.4,
      ratingsCount: 56,
    },
    {
      title: 'Perplexity AI - Research Assistant thông minh',
      shortDesc: 'Tìm kiếm và research thông tin với Perplexity AI',
      description: 'Khóa học Perplexity AI giúp bạn tận dụng AI search engine mạnh mẽ này. Học cách research, fact-checking và information gathering hiệu quả.',
      slug: 'perplexity-ai-research-assistant-thong-minh',
      priceId: priceIds.freemium,
      status: 'PUBLIC' as const,
      isFeatured: false,
      bodyHtml: `
        <div class="tool-marketing-content">
          <h2>AI-Powered Research</h2>
          <p>Perplexity AI là search engine thông minh với AI.</p>
          
          <h3>Features</h3>
          <ul>
            <li>Intelligent search</li>
            <li>Source citations</li>
            <li>Research workflows</li>
            <li>Fact-checking</li>
          </ul>
        </div>
      `,
      viewsCount: 1100,
      reactionsCount: 76,
      sharesCount: 38,
      commentsCount: 20,
      avgRating: 4.5,
      ratingsCount: 48,
    },
  ];

  const createdToolMarketings: any[] = [];
  for (const toolData of toolMarketings) {
    // Check if tool marketing with this slug already exists
    const existing = await db.toolMarketing.findUnique({
      where: { slug: toolData.slug },
    });

    if (existing) {
      console.log(`  ⏭️  Skipped tool marketing (already exists): ${toolData.title}`);
      createdToolMarketings.push(existing);
      continue;
    }

    const toolMarketing = await db.toolMarketing.create({
      data: {
        ...toolData,
        createdBy: adminUserId,
        chapterCount: 4,
        lessonCount: 20,
        documentCount: 8,
      },
    });
    createdToolMarketings.push(toolMarketing);
    console.log(`  ✅ Created tool marketing: ${toolMarketing.title}`);
  }

  console.log(`✅ Created ${createdToolMarketings.length} tool marketings`);
  return createdToolMarketings;
}

