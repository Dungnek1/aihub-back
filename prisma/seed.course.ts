import { PrismaClient } from '@prisma/client';

export async function seedCourses(db: any, priceIds: any, adminUserId: string) {
  console.log('📚 Seeding Courses...');

  const courses = [
    {
      title: 'Lập trình Python từ cơ bản đến nâng cao',
      shortDesc: 'Khóa học toàn diện về Python cho người mới bắt đầu và lập trình viên muốn nâng cao kỹ năng',
      description: 'Khóa học Python từ cơ bản đến nâng cao giúp bạn nắm vững ngôn ngữ lập trình phổ biến nhất hiện nay. Bạn sẽ học từ cú pháp cơ bản đến các khái niệm nâng cao như OOP, decorators, và async programming.',
      slug: 'lap-trinh-python-tu-co-ban-den-nang-cao',
      priceId: priceIds.freemium,
      status: 'PUBLIC' as const,
      isFeatured: true,
      bodyHtml: `
        <div class="course-content">
          <h2>Giới thiệu khóa học</h2>
          <p>Python là một trong những ngôn ngữ lập trình phổ biến nhất thế giới, được sử dụng rộng rãi trong phát triển web, data science, AI, và automation.</p>
          
          <h3>Nội dung khóa học</h3>
          <ul>
            <li>Cú pháp Python cơ bản</li>
            <li>Làm việc với dữ liệu (lists, dictionaries, sets)</li>
            <li>Functions và modules</li>
            <li>Object-Oriented Programming</li>
            <li>File handling và exception handling</li>
            <li>Working with APIs</li>
            <li>Database integration</li>
            <li>Testing và debugging</li>
          </ul>
          
          <h3>Bạn sẽ học được gì?</h3>
          <p>Sau khi hoàn thành khóa học, bạn sẽ có thể:</p>
          <ul>
            <li>Viết code Python chuyên nghiệp</li>
            <li>Xây dựng ứng dụng web với Flask/Django</li>
            <li>Làm việc với dữ liệu và databases</li>
            <li>Áp dụng best practices trong Python</li>
          </ul>
        </div>
      `,
      viewsCount: 1250,
      reactionsCount: 89,
      sharesCount: 45,
      commentsCount: 23,
      avgRating: 4.5,
      ratingsCount: 67,
    },
    {
      title: 'Machine Learning với Python và TensorFlow',
      shortDesc: 'Học Machine Learning từ đầu với Python, TensorFlow và các thư viện AI phổ biến',
      description: 'Khóa học Machine Learning toàn diện giúp bạn hiểu và áp dụng các thuật toán ML vào thực tế. Bạn sẽ học cách xây dựng models, train và evaluate models với TensorFlow.',
      slug: 'machine-learning-voi-python-va-tensorflow',
      priceId: priceIds.subscription,
      status: 'PUBLIC' as const,
      isFeatured: true,
      bodyHtml: `
        <div class="course-content">
          <h2>Machine Learning Fundamentals</h2>
          <p>Khóa học này sẽ đưa bạn từ những khái niệm cơ bản đến các kỹ thuật nâng cao trong Machine Learning.</p>
          
          <h3>Nội dung chính</h3>
          <ul>
            <li>Giới thiệu về Machine Learning</li>
            <li>Supervised Learning (Regression, Classification)</li>
            <li>Unsupervised Learning (Clustering, Dimensionality Reduction)</li>
            <li>Neural Networks và Deep Learning</li>
            <li>TensorFlow và Keras</li>
            <li>Model evaluation và optimization</li>
            <li>Deploy ML models</li>
          </ul>
        </div>
      `,
      viewsCount: 2100,
      reactionsCount: 156,
      sharesCount: 78,
      commentsCount: 45,
      avgRating: 4.7,
      ratingsCount: 92,
    },
    {
      title: 'Web Development với React và Next.js',
      shortDesc: 'Xây dựng ứng dụng web hiện đại với React, Next.js và TypeScript',
      description: 'Khóa học Web Development với React và Next.js giúp bạn trở thành full-stack developer. Học cách xây dựng SPA và SSR applications với best practices.',
      slug: 'web-development-voi-react-va-nextjs',
      priceId: priceIds.freemium,
      status: 'PUBLIC' as const,
      isFeatured: true,
      bodyHtml: `
        <div class="course-content">
          <h2>Modern Web Development</h2>
          <p>React và Next.js là những công nghệ hàng đầu trong phát triển web hiện đại.</p>
          
          <h3>Bạn sẽ học</h3>
          <ul>
            <li>React fundamentals (Components, Hooks, State Management)</li>
            <li>Next.js routing và SSR</li>
            <li>TypeScript integration</li>
            <li>API routes và data fetching</li>
            <li>Authentication và authorization</li>
            <li>Deployment và optimization</li>
          </ul>
        </div>
      `,
      viewsCount: 1890,
      reactionsCount: 134,
      sharesCount: 67,
      commentsCount: 38,
      avgRating: 4.6,
      ratingsCount: 78,
    },
    {
      title: 'DevOps và CI/CD với Docker và Kubernetes',
      shortDesc: 'Học DevOps, containerization với Docker và orchestration với Kubernetes',
      description: 'Khóa học DevOps toàn diện giúp bạn hiểu về containerization, CI/CD pipelines, và cloud infrastructure. Học cách deploy và scale applications.',
      slug: 'devops-va-cicd-voi-docker-va-kubernetes',
      priceId: priceIds.subscription,
      status: 'PUBLIC' as const,
      isFeatured: false,
      bodyHtml: `
        <div class="course-content">
          <h2>DevOps Mastery</h2>
          <p>Từ Docker đến Kubernetes, học cách quản lý infrastructure hiện đại.</p>
          
          <h3>Nội dung</h3>
          <ul>
            <li>Docker và containerization</li>
            <li>Kubernetes basics và advanced</li>
            <li>CI/CD với GitHub Actions và GitLab CI</li>
            <li>Infrastructure as Code</li>
            <li>Monitoring và logging</li>
          </ul>
        </div>
      `,
      viewsCount: 980,
      reactionsCount: 67,
      sharesCount: 34,
      commentsCount: 19,
      avgRating: 4.4,
      ratingsCount: 45,
    },
    {
      title: 'Data Science với Python và Pandas',
      shortDesc: 'Phân tích dữ liệu, visualization và machine learning với Python',
      description: 'Khóa học Data Science giúp bạn làm việc với dữ liệu lớn, phân tích và visualization. Học Pandas, NumPy, Matplotlib và các công cụ data science khác.',
      slug: 'data-science-voi-python-va-pandas',
      priceId: priceIds.freemium,
      status: 'PUBLIC' as const,
      isFeatured: true,
      bodyHtml: `
        <div class="course-content">
          <h2>Data Science Essentials</h2>
          <p>Trở thành Data Scientist với Python và các thư viện mạnh mẽ.</p>
          
          <h3>Chủ đề chính</h3>
          <ul>
            <li>Data manipulation với Pandas</li>
            <li>Data visualization với Matplotlib và Seaborn</li>
            <li>Statistical analysis</li>
            <li>Data cleaning và preprocessing</li>
            <li>Exploratory Data Analysis</li>
          </ul>
        </div>
      `,
      viewsCount: 1650,
      reactionsCount: 112,
      sharesCount: 56,
      commentsCount: 31,
      avgRating: 4.5,
      ratingsCount: 64,
    },
    {
      title: 'Mobile App Development với Flutter',
      shortDesc: 'Xây dựng ứng dụng mobile đa nền tảng với Flutter và Dart',
      description: 'Học Flutter để tạo ứng dụng iOS và Android với một codebase duy nhất. Khóa học từ cơ bản đến nâng cao với các dự án thực tế.',
      slug: 'mobile-app-development-voi-flutter',
      priceId: priceIds.subscription,
      status: 'PUBLIC' as const,
      isFeatured: false,
      bodyHtml: `
        <div class="course-content">
          <h2>Flutter Development</h2>
          <p>Xây dựng ứng dụng mobile đẹp và hiệu năng cao với Flutter.</p>
          
          <h3>Nội dung</h3>
          <ul>
            <li>Dart programming language</li>
            <li>Flutter widgets và layouts</li>
            <li>State management</li>
            <li>API integration</li>
            <li>Firebase integration</li>
            <li>Publishing apps</li>
          </ul>
        </div>
      `,
      viewsCount: 1420,
      reactionsCount: 98,
      sharesCount: 49,
      commentsCount: 27,
      avgRating: 4.6,
      ratingsCount: 58,
    },
    {
      title: 'Blockchain Development với Solidity',
      shortDesc: 'Học phát triển smart contracts và DApps với Solidity và Ethereum',
      description: 'Khóa học Blockchain Development giúp bạn hiểu về blockchain, smart contracts và cách xây dựng decentralized applications (DApps).',
      slug: 'blockchain-development-voi-solidity',
      priceId: priceIds.paid,
      status: 'PUBLIC' as const,
      isFeatured: false,
      bodyHtml: `
        <div class="course-content">
          <h2>Blockchain và Smart Contracts</h2>
          <p>Bước vào thế giới blockchain và Web3 với Solidity.</p>
          
          <h3>Bạn sẽ học</h3>
          <ul>
            <li>Blockchain fundamentals</li>
            <li>Ethereum và EVM</li>
            <li>Solidity programming</li>
            <li>Smart contract development</li>
            <li>DApp development</li>
            <li>DeFi basics</li>
          </ul>
        </div>
      `,
      viewsCount: 890,
      reactionsCount: 56,
      sharesCount: 28,
      commentsCount: 15,
      avgRating: 4.3,
      ratingsCount: 38,
    },
    {
      title: 'Cybersecurity và Ethical Hacking',
      shortDesc: 'Học bảo mật thông tin, penetration testing và ethical hacking',
      description: 'Khóa học Cybersecurity giúp bạn hiểu về bảo mật hệ thống, các lỗ hổng bảo mật và cách phòng chống. Học ethical hacking và penetration testing.',
      slug: 'cybersecurity-va-ethical-hacking',
      priceId: priceIds.subscription,
      status: 'PUBLIC' as const,
      isFeatured: true,
      bodyHtml: `
        <div class="course-content">
          <h2>Cybersecurity Essentials</h2>
          <p>Bảo vệ hệ thống và dữ liệu khỏi các mối đe dọa bảo mật.</p>
          
          <h3>Nội dung</h3>
          <ul>
            <li>Network security</li>
            <li>Web application security</li>
            <li>Penetration testing</li>
            <li>Vulnerability assessment</li>
            <li>Security tools và techniques</li>
          </ul>
        </div>
      `,
      viewsCount: 1100,
      reactionsCount: 78,
      sharesCount: 39,
      commentsCount: 22,
      avgRating: 4.5,
      ratingsCount: 52,
    },
    {
      title: 'Cloud Computing với AWS',
      shortDesc: 'Làm chủ AWS: EC2, S3, Lambda, và các dịch vụ cloud khác',
      description: 'Khóa học AWS giúp bạn hiểu về cloud computing và cách sử dụng các dịch vụ AWS. Học cách deploy và scale applications trên cloud.',
      slug: 'cloud-computing-voi-aws',
      priceId: priceIds.subscription,
      status: 'PUBLIC' as const,
      isFeatured: false,
      bodyHtml: `
        <div class="course-content">
          <h2>AWS Cloud Mastery</h2>
          <p>Trở thành AWS certified với khóa học toàn diện này.</p>
          
          <h3>Dịch vụ AWS</h3>
          <ul>
            <li>EC2 và VPC</li>
            <li>S3 và storage services</li>
            <li>Lambda và serverless</li>
            <li>RDS và databases</li>
            <li>CloudFormation và IaC</li>
          </ul>
        </div>
      `,
      viewsCount: 1350,
      reactionsCount: 94,
      sharesCount: 47,
      commentsCount: 26,
      avgRating: 4.6,
      ratingsCount: 61,
    },
    {
      title: 'UI/UX Design với Figma',
      shortDesc: 'Thiết kế giao diện đẹp và user experience tốt với Figma',
      description: 'Khóa học UI/UX Design giúp bạn học cách thiết kế giao diện đẹp, tạo prototypes và cải thiện user experience. Học Figma từ cơ bản đến nâng cao.',
      slug: 'ui-ux-design-voi-figma',
      priceId: priceIds.freemium,
      status: 'PUBLIC' as const,
      isFeatured: false,
      bodyHtml: `
        <div class="course-content">
          <h2>Design với Figma</h2>
          <p>Tạo designs chuyên nghiệp và prototypes tương tác.</p>
          
          <h3>Nội dung</h3>
          <ul>
            <li>Figma basics và interface</li>
            <li>Design systems</li>
            <li>Prototyping</li>
            <li>Collaboration features</li>
            <li>Design best practices</li>
          </ul>
        </div>
      `,
      viewsCount: 980,
      reactionsCount: 68,
      sharesCount: 34,
      commentsCount: 18,
      avgRating: 4.4,
      ratingsCount: 42,
    },
  ];

  const createdCourses: any[] = [];
  for (const courseData of courses) {
    // Check if course with this slug already exists
    const existing = await db.course.findUnique({
      where: { slug: courseData.slug },
    });

    if (existing) {
      console.log(`  ⏭️  Skipped course (already exists): ${courseData.title}`);
      createdCourses.push(existing);
      continue;
    }

    const course = await db.course.create({
      data: {
        ...courseData,
        createdBy: adminUserId,
        chapterCount: 5,
        lessonCount: 25,
        documentCount: 10,
      },
    });
    createdCourses.push(course);
    console.log(`  ✅ Created course: ${course.title}`);
  }

  console.log(`✅ Created ${createdCourses.length} courses`);
  return createdCourses;
}

