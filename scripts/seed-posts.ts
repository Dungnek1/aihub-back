import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import * as http from 'http';

const prisma = new PrismaClient();
const db: any = prisma;

function generateRandomId(): string {
  return `seed-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
}

// Sample image URLs từ Unsplash
const SAMPLE_IMAGES = [
  'https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=800',
  'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800',
  'https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?w=800',
  'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800',
  'https://images.unsplash.com/photo-1501504905252-473c47e087f8?w=800',
  'https://images.unsplash.com/photo-1516321497487-e288fb19713f?w=800',
  'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=800',
  'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800',
  'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800',
  'https://images.unsplash.com/photo-1552664730-d307ca884978?w=800',
];

const POST_TITLES = [
  'Hướng dẫn sử dụng AI trong Marketing hiện đại',
  'Top 10 công cụ AI tốt nhất cho doanh nghiệp năm 2025',
  'Blockchain và tương lai của công nghệ tài chính',
  'Machine Learning: Từ cơ bản đến nâng cao',
  'Cloud Computing - Xu hướng công nghệ không thể bỏ qua',
  'DevOps và CI/CD: Tăng tốc độ phát triển phần mềm',
  'Web Development với React và Next.js',
  'Mobile App Development: Flutter vs React Native',
  'Data Science và Phân tích dữ liệu lớn',
  'Cybersecurity: Bảo mật thông tin trong thời đại số',
];

const POST_CONTENTS = [
  '<h2>Giới thiệu về AI trong Marketing</h2><p>Trí tuệ nhân tạo đang cách mạng hóa ngành marketing, giúp các doanh nghiệp tối ưu hóa chiến lược và tăng ROI.</p><h3>Lợi ích của AI trong Marketing</h3><ul><li>Tự động hóa quy trình</li><li>Phân tích dữ liệu chính xác</li><li>Cá nhân hóa trải nghiệm khách hàng</li></ul>',
  '<h2>Top công cụ AI hàng đầu</h2><p>Khám phá các công cụ AI mạnh mẽ nhất đang được sử dụng trong doanh nghiệp hiện nay.</p>',
  '<h2>Blockchain là gì?</h2><p>Blockchain đang thay đổi cách chúng ta giao dịch và lưu trữ dữ liệu. Tìm hiểu về công nghệ này và ứng dụng thực tế.</p>',
  '<h2>Machine Learning cơ bản</h2><p>Học machine learning từ những khái niệm cơ bản nhất đến các kỹ thuật nâng cao.</p>',
  '<h2>Cloud Computing</h2><p>Cloud computing đang trở thành nền tảng của mọi ứng dụng hiện đại. Tìm hiểu về các dịch vụ cloud hàng đầu.</p>',
  '<h2>DevOps và CI/CD</h2><p>DevOps giúp tăng tốc độ phát triển và triển khai phần mềm. Tìm hiểu về các best practices.</p>',
  '<h2>Web Development hiện đại</h2><p>React và Next.js là những framework mạnh mẽ cho web development. Học cách xây dựng ứng dụng web hiện đại.</p>',
  '<h2>Mobile App Development</h2><p>So sánh Flutter và React Native - hai framework phổ biến nhất cho mobile development.</p>',
  '<h2>Data Science</h2><p>Data Science giúp khai thác giá trị từ dữ liệu lớn. Tìm hiểu về các kỹ thuật phân tích dữ liệu.</p>',
  '<h2>Cybersecurity</h2><p>Bảo mật thông tin là ưu tiên hàng đầu trong thời đại số. Tìm hiểu về các mối đe dọa và cách phòng chống.</p>',
];

async function downloadImage(url: string, filepath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    
    client.get(url, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        return downloadImage(response.headers.location!, filepath)
          .then(resolve)
          .catch(reject);
      }
      
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download image: ${response.statusCode}`));
        return;
      }

      const fileStream = fs.createWriteStream(filepath);
      response.pipe(fileStream);
      
      fileStream.on('finish', () => {
        fileStream.close();
        resolve();
      });
      
      fileStream.on('error', (err) => {
        fs.unlink(filepath, () => {});
        reject(err);
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}

async function createMediaFromUrl(url: string, userId: string, folderType: string = 'blog'): Promise<string | null> {
  try {
    const publicDir = path.join(process.cwd(), 'public', 'image', folderType);
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true });
    }

    const fileExtension = path.extname(new URL(url).pathname) || '.jpg';
    const baseFilename = `seed-post-${generateRandomId()}${fileExtension}`;
    const fullFilename = `image/${folderType}/${baseFilename}`;
    const filepath = path.join(publicDir, baseFilename);

    console.log(`📥 Downloading image from ${url}...`);
    await downloadImage(url, filepath);
    
    const stats = fs.statSync(filepath);
    const fileSize = stats.size;

    const media = await db.media.create({
      data: {
        filename: fullFilename,
        originalName: `seed-post-${Date.now()}${fileExtension}`,
        mimeType: 'image/jpeg',
        size: fileSize,
        metadata: JSON.stringify({ type: 'image', folderType: folderType, url: url }),
        createdBy: userId,
        updatedBy: userId,
        uploadedId: userId,
      },
    });

    return media.id;
  } catch (error) {
    console.error(`Error creating media from URL ${url}:`, error);
    return null;
  }
}

async function hashPassword(password: string): Promise<string> {
  const saltRounds = 10;
  return bcrypt.hash(password, saltRounds);
}

async function getOrCreateAdminUser(): Promise<string> {
  let adminUser = await db.user.findFirst({
    where: { role: 'ADMIN' },
  });

  if (!adminUser) {
    console.log('👤 Admin user not found, creating new admin user...');
    const hashedPassword = await hashPassword('123456@Aa');
    
    adminUser = await db.user.create({
      data: {
        userId: 'admin-1',
        username: 'admin',
        password: hashedPassword,
        email: 'admin@aihub.com',
        name: 'Administrator',
        role: 'ADMIN',
        status: 'ACTIVE',
        canPost: true,
        emailVerified: true,
      },
    });
    console.log('✅ Created admin user:', adminUser.userId);
  }

  return adminUser.userId;
}

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

async function createPostWithImage(title: string, bodyHtml: string, imageUrl: string, userId: string, index: number) {
  try {
    // Tạo slug
    let slug = generateSlug(title);
    const existingPost = await db.post.findUnique({ where: { slug } });
    if (existingPost) {
      slug = `${slug}-${index}`;
    }

    // Tạo media từ URL
    const mediaId = await createMediaFromUrl(imageUrl, userId, 'blog');
    if (!mediaId) {
      console.log(`⚠️  Failed to create media for post ${index + 1}, continuing without image...`);
    }

    // Tạo Content
    const content = await db.content.create({
      data: {
        kind: 'news',
        authorId: userId,
        status: 'PUBLISHED',
        createdBy: userId,
        updatedBy: userId,
      },
    });

    // Tạo StatusFeed và StatusFeedAttachment nếu có media
    let coverImageId: string | null = null;
    if (mediaId) {
      let statusFeed = await db.statusFeed.findUnique({ where: { contentId: content.id } });
      if (!statusFeed) {
        statusFeed = await db.statusFeed.create({
          data: {
            contentId: content.id,
            privacyInt: 1,
          },
        });
      }

      const attachment = await db.statusFeedAttachment.create({
        data: {
          statusId: statusFeed.id,
          mediaId: mediaId,
        },
      });

      coverImageId = attachment.id;
    }

    // Tạo Post
    const post = await db.post.create({
      data: {
        contentId: content.id,
        title,
        slug,
        bodyHtml,
        coverImageId,
        status: 'PUBLISHED',
        categoryId: null,
      },
    });

    console.log(`✅ Created post ${index + 1}: ${title}`);
    return post;
  } catch (error) {
    console.error(`❌ Error creating post ${index + 1}:`, error);
    throw error;
  }
}

async function main() {
  console.log('🌱 Starting to seed 10 posts with images...');

  try {
    const userId = await getOrCreateAdminUser();
    console.log(`👤 Using user: ${userId}`);

    for (let i = 0; i < 10; i++) {
      const title = POST_TITLES[i];
      const bodyHtml = POST_CONTENTS[i];
      const imageUrl = SAMPLE_IMAGES[i];

      await createPostWithImage(title, bodyHtml, imageUrl, userId, i);
      
      // Delay để tránh rate limit
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log('✅ Successfully created 10 posts with images!');
  } catch (error) {
    console.error('❌ Error during seeding:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

