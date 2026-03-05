import { Injectable, Inject, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { PrismaService, Role } from '@app/database';

// Type definitions for Prisma queries
type PostWithContent = {
  id: string;
  title: string;
  slug: string;
  content?: {
    author?: {
      userId: string;
      username: string;
      avatarUrl?: string | null;
    } | null;
  } | null;
};

type ContentWithPost = {
  id: string;
  post?: {
    id: string;
    title: string;
    slug: string;
  } | null;
  author?: {
    userId: string;
    username: string;
    avatarUrl?: string | null;
  } | null;
};

interface SEOData {
  metaTitle?: string;
  metaDescription?: string;
  focusKeyword?: string;
  secondaryKeywords?: string[];
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  twitterCard?: 'summary' | 'summary_large_image';
  twitterTitle?: string;
  twitterDescription?: string;
  twitterImage?: string;
  canonicalUrl?: string;
  readingTime?: number;
  schema?: {
    article?: any;
    faqPage?: any;
    definedTerm?: any;
  };
}

interface CreatePostDto {
  title: string;
  slug: string;
  bodyHtml?: string;
  categoryId?: string;
  tagIds?: string[];
  authorId: string;
  coverImageId?: string;
  role?: string;
  locale?: string;
  seo?: SEOData;
  excerpt?: string;
  authorName?: string;
  publishedAt?: string;
}

interface UpdatePostDto {
  title?: string;
  slug?: string;
  bodyHtml?: string;
  categoryId?: string;
  seo?: SEOData;
  excerpt?: string;
  authorName?: string;
  publishedAt?: string;
}

@Injectable()
export class BlogServiceService {
  private readonly logger = new Logger(BlogServiceService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    @Inject('NOTIFICATION_CLIENT') private readonly notificationClient: ClientProxy,
  ) { }

  // ===== Helper Functions =====

  /**
   * Calculate reading time from HTML content
   * Average reading speed: 200 words/minute
   */
  private calculateReadingTime(bodyHtml: string | null | undefined): number {
    if (!bodyHtml) return 0;
    
    // Remove HTML tags
    const text = bodyHtml.replace(/<[^>]*>/g, '');
    // Remove extra whitespace
    const cleanText = text.replace(/\s+/g, ' ').trim();
    // Count words (Vietnamese + English)
    const words = cleanText.split(' ').filter(word => word.length > 0).length;
    // Calculate reading time (200 words/minute)
    return Math.max(1, Math.ceil(words / 200));
  }

  /**
   * Generate Article Schema from post data
   */
  private generateArticleSchema(post: any, author: any, baseUrl: string = 'https://aihubvietnam.com'): any {
    const seo = post.seo || {};
    const coverImage = post.coverImage?.media || null;
    const imageUrl = coverImage 
      ? `${baseUrl}/${coverImage.filename}`
      : seo.ogImage || `${baseUrl}/og-image.png`;

    return {
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": seo.metaTitle || post.title,
      "description": seo.metaDescription || post.excerpt || post.title,
      "image": {
        "@type": "ImageObject",
        "url": imageUrl,
        "width": 1200,
        "height": 630
      },
      "author": {
        "@type": "Person",
        "name": post.authorName || author?.name || "AI Hub Vietnam"
      },
      "publisher": {
        "@type": "Organization",
        "name": "AI Hub Vietnam",
        "logo": {
          "@type": "ImageObject",
          "url": `${baseUrl}/logo.png`
        }
      },
      "datePublished": post.publishedAt || post.createdAt,
      "dateModified": post.updatedAt || post.createdAt,
      "mainEntityOfPage": {
        "@type": "WebPage",
        "@id": `${baseUrl}/${post.slug}`
      }
    };
  }

  /**
   * Prepare SEO data for saving
   */
  private prepareSEOData(seo: SEOData | undefined, bodyHtml: string | null | undefined, post?: any): any {
    if (!seo) return null;

    const seoData: any = { ...seo };

    // Auto-calculate reading time if not provided
    if (!seoData.readingTime && bodyHtml) {
      seoData.readingTime = this.calculateReadingTime(bodyHtml);
    }

    // Auto-generate meta description from excerpt if not provided
    if (!seoData.metaDescription && post?.excerpt) {
      // Take first 160 characters
      seoData.metaDescription = post.excerpt.substring(0, 160).trim();
    }

    // Auto-fill OG fields if not provided
    if (!seoData.ogTitle) {
      seoData.ogTitle = seoData.metaTitle;
    }
    if (!seoData.ogDescription) {
      seoData.ogDescription = seoData.metaDescription;
    }

    // Auto-fill Twitter fields if not provided
    if (!seoData.twitterTitle) {
      seoData.twitterTitle = seoData.metaTitle;
    }
    if (!seoData.twitterDescription) {
      seoData.twitterDescription = seoData.metaDescription;
    }
    if (!seoData.twitterCard) {
      seoData.twitterCard = 'summary_large_image';
    }

    return seoData;
  }

  // ===== JSON Stringify Helper =====

  /**
   * Stringify HTML before saving to database
   * Frontend will JSON.parse() to get original HTML
   */
  private stringifyHtml(html: string | undefined): string | undefined {
    if (!html) return html;
    return JSON.stringify(html);
  }

  /**
   * Normalize cover image filename - remove proxy URLs and ensure it's a relative path
   */
  private normalizeCoverImageFilename(filename: string | null | undefined): string | null {
    if (!filename) return null;
    
    // Check if it's a proxy URL (Zalo, etc.)
    const isProxyUrl = filename.includes('zadn.vn') || 
                     filename.includes('photo-link-talk') ||
                     filename.includes('photolink');
    
    if (isProxyUrl) {
      // If it's a proxy URL, return null - frontend will handle fallback
      this.logger.warn(`[normalizeCoverImageFilename] Cover image filename is a proxy URL, ignoring: ${filename}`);
      return null;
    }
    
    // If it's a full URL, extract just the pathname
    if (filename.startsWith('http://') || filename.startsWith('https://')) {
      try {
        const urlObj = new URL(filename);
        return urlObj.pathname.startsWith('/') ? urlObj.pathname.substring(1) : urlObj.pathname;
      } catch {
        // If URL parsing fails, log warning and return null
        this.logger.warn(`[normalizeCoverImageFilename] Failed to parse cover image URL: ${filename}`);
        return null;
      }
    }
    
    // It's already a relative path, use it as-is
    return filename;
  }

  /**
   * Parse stringified HTML when returning to frontend
   * Automatically converts JSON string back to original HTML
   */
  private parseHtml(html: string | undefined | null): string | undefined | null {
    if (!html) return html;
    try {
      let parsedHtml: string;
      
      // Check if it's a JSON string (starts and ends with quotes)
      if (html.startsWith('"') && html.endsWith('"')) {
        parsedHtml = JSON.parse(html);
      } else {
        parsedHtml = html;
      }
      
      // Log for debugging (only log first 200 chars to avoid spam)
      const preview = parsedHtml.substring(0, 200);
      const imgCount = (parsedHtml.match(/<img/gi) || []).length;
      this.logger.debug(`[parseHtml] Processing HTML (length: ${parsedHtml.length}, images: ${imgCount}): ${preview}...`);
      
      // Normalize image URLs in HTML content
      // Only replace localhost URLs, keep other full URLs (external URLs) as-is
      // For short-links (relative paths), prepend backend base URL
      const apiGatewayBaseUrl = this.configService.get<string>('API_GATEWAY_BASE_URL') || 'http://localhost:9000';
      let backendOrigin: string;
      try {
        backendOrigin = new URL(apiGatewayBaseUrl).origin;
      } catch {
        backendOrigin = apiGatewayBaseUrl.replace(/\/+$/, '');
      }
      
      // Improved regex to match img tags with src attribute in any position
      // Pattern: <img ... src="..." ...> or <img ... src='...' ...>
      parsedHtml = parsedHtml.replace(
        /<img\s+([^>]*?)\ssrc=["']([^"']+)["']([^>]*?)>/gi,
        (match, before, src, after) => {
          try {
            // Check if it's already a full URL (http:// or https://)
            const isFullUrl = /^https?:\/\//i.test(src);
            
            let normalizedSrc = src;
            
            if (isFullUrl) {
              // If it's a full URL, only replace localhost URLs with configured backend URL
              // Keep other full URLs (external URLs) as-is
              if (/localhost:\d+/i.test(src)) {
                // Replace localhost:port with backend origin
                try {
                  const urlObj = new URL(src);
                  normalizedSrc = `${backendOrigin}${urlObj.pathname}${urlObj.search}${urlObj.hash}`;
                  this.logger.debug(`[parseHtml] Normalized localhost URL: ${src} -> ${normalizedSrc}`);
                } catch (error) {
                  this.logger.warn(`[parseHtml] Failed to parse URL: ${src}`, error);
                  // Keep original if parsing fails
                }
              }
              // If it's a full URL but not localhost, keep it as-is (external URL)
            } else {
              // If it's a short-link (relative path), normalize it with base URL
              // Only normalize if it looks like an image path
              if (src.startsWith('/') || src.includes('/image/') || src.includes('/media/')) {
                const cleanPath = src.startsWith('/') ? src : `/${src}`;
                normalizedSrc = `${backendOrigin}${cleanPath}`;
                this.logger.debug(`[parseHtml] Normalized short-link: ${src} -> ${normalizedSrc}`);
              }
              // Keep other relative paths as-is (might be data URIs, etc.)
            }
            
            // Reconstruct img tag with normalized src
            return `<img ${before} src="${normalizedSrc}" ${after}>`;
          } catch (error) {
            this.logger.warn(`[parseHtml] Failed to normalize image URL in match: ${match}`, error);
            return match; // Return original if normalization fails
          }
        }
      );
      
      // Also handle cases where src might be without quotes (edge case)
      parsedHtml = parsedHtml.replace(
        /<img\s+([^>]*?)\ssrc=([^\s>]+)([^>]*?)>/gi,
        (match, before, src, after) => {
          // Only process if src doesn't already have quotes (already processed above)
          if (!src.startsWith('"') && !src.startsWith("'")) {
            try {
              const isFullUrl = /^https?:\/\//i.test(src);
              let normalizedSrc = src;
              
              if (isFullUrl && /localhost:\d+/i.test(src)) {
                try {
                  const urlObj = new URL(src);
                  normalizedSrc = `${backendOrigin}${urlObj.pathname}${urlObj.search}${urlObj.hash}`;
                } catch {
                  // Keep original if parsing fails
                }
              } else if (!isFullUrl && (src.startsWith('/') || src.includes('/image/') || src.includes('/media/'))) {
                const cleanPath = src.startsWith('/') ? src : `/${src}`;
                normalizedSrc = `${backendOrigin}${cleanPath}`;
              }
              
              return `<img ${before} src="${normalizedSrc}" ${after}>`;
            } catch {
              return match;
            }
          }
          return match;
        }
      );
      
      // Also handle cases where URL might be in style attributes or other places
      const styleUrlPattern = /(url\(["']?)(https?:\/\/localhost:\d+)([^"')]*)(["']?\))/gi;
      parsedHtml = parsedHtml.replace(styleUrlPattern, (match, prefix, localhostUrl, path, suffix) => {
        return `${prefix}${backendOrigin}${path}${suffix}`;
      });
      
      return parsedHtml;
    } catch (error) {
      this.logger.error('Error parsing HTML:', error);
      return html; // Return original if parse fails
    }
  }

  /**
   * Parse bodyHtml in post object
   */
  private parsePostHtml(post: any): any {
    if (!post) return post;
    return {
      ...post,
      bodyHtml: this.parseHtml(post.bodyHtml),
    };
  }

  /**
   * Parse bodyHtml in array of posts
   */
  private parsePostsHtml(posts: any[]): any[] {
    return posts.map(post => this.parsePostHtml(post));
  }

  async createPost(data: CreatePostDto) {
    try {
      const { title, slug, bodyHtml, categoryId, tagIds, authorId, coverImageId, role, locale, seo, excerpt, authorName, publishedAt } = data;

      // Fetch user to check role
      const user = await this.prisma.user.findUnique({
        where: { userId: authorId },
        select: { role: true },
      });

      if (!user) {
        throw new Error('User not found');
      }

      // NOTE: coverImageId processing is done after content creation because
      // if the caller provides a media id (from media service) we need the
      // content id to create a StatusFeed and then a StatusFeedAttachment.

      // Set status based on role
      const status = user.role === 'ADMIN' ? 'PUBLISHED' : 'DRAFT';

      // Create content first
      const content = await this.prisma.content.create({
        data: {
          kind: 'news',
          authorId,
          status,
        },
      });

      // Handle cover image: the client may send either:
      // - an existing StatusFeedAttachment id (attachment id)
      // - or a Media id (uploaded via media service)
      // If it's a Media id we need to create a StatusFeed (for this content)
      // and then a StatusFeedAttachment that references that media, and use
      // the created attachment id as the post.coverImageId.
      let finalCoverAttachmentId: string | undefined = undefined;
      if (coverImageId) {
        console.log('Processing coverImageId:', coverImageId);
        // Check if this is already an attachment id
        const existingAttachment = await this.prisma.statusFeedAttachment.findUnique({
          where: { id: coverImageId },
        });
        if (existingAttachment) {
          console.log('Found existing attachment:', existingAttachment.id);
          finalCoverAttachmentId = existingAttachment.id;
        } else {
          console.log('Not an existing attachment, checking if it\'s a media ID');
          // Check if it's a media id
          const media = await this.prisma.media.findUnique({ where: { id: coverImageId } });
          if (!media) {
            console.log('Media not found for ID:', coverImageId);
            throw new Error(`Cover image not found: ${coverImageId}`);
          }

          console.log('Found media:', media.id, 'creating StatusFeed and attachment');

          try {
            // Ensure a StatusFeed exists for this content (contentId is unique on StatusFeed)
            let statusFeed = await this.prisma.statusFeed.findUnique({ where: { contentId: content.id } });
            if (!statusFeed) {
              console.log('Creating StatusFeed for content:', content.id);
              statusFeed = await this.prisma.statusFeed.create({
                data: {
                  contentId: content.id,
                  privacyInt: 1, // public
                },
              });
              console.log('Created StatusFeed:', statusFeed.id);
            } else {
              console.log('Found existing StatusFeed:', statusFeed.id);
            }

            const attachment = await this.prisma.statusFeedAttachment.create({
              data: {
                statusId: statusFeed.id,
                mediaId: media.id,
              },
            });

            console.log('Created StatusFeedAttachment:', attachment.id);
            finalCoverAttachmentId = attachment.id;
          } catch (error) {
            console.error('Error creating StatusFeedAttachment:', error);
            throw new Error('Failed to create cover image attachment');
          }
        }
      } else {
        console.log('No coverImageId provided');
      }

      // Prepare SEO data
      let seoData = this.prepareSEOData(seo, bodyHtml);
      
      // Process schema data if provided
      if (seoData?.schema) {
        // Ensure FAQPage is in correct format
        if (seoData.schema.faqPage && Array.isArray(seoData.schema.faqPage)) {
          // If already in Schema.org format, keep it; otherwise convert
          if (seoData.schema.faqPage.length > 0 && !seoData.schema.faqPage[0]['@type']) {
            seoData.schema.faqPage = seoData.schema.faqPage.map((faq: any) => ({
              "@type": "Question",
              "name": faq.question || faq.name,
              "acceptedAnswer": {
                "@type": "Answer",
                "text": faq.answer || faq.text
              }
            }));
          }
        }
        
        // Ensure DefinedTerm is in correct format
        if (seoData.schema.definedTerm) {
          if (!seoData.schema.definedTerm['@type']) {
            seoData.schema.definedTerm = {
              "@type": "DefinedTerm",
              "name": seoData.schema.definedTerm.name,
              "description": seoData.schema.definedTerm.description,
              "inDefinedTermSet": {
                "@type": "DefinedTermSet",
                "name": "AI Hub Vietnam Knowledge Base"
              }
            };
          }
        }
      }
      
      // Parse publishedAt date if provided
      const publishedDate = publishedAt ? new Date(publishedAt) : undefined;

      // Create post linked to content
      const post = await this.prisma.post.create({
        data: {
          contentId: content.id,
          title,
          slug,
          bodyHtml: bodyHtml, // Stringify before saving
          categoryId,
          coverImageId: finalCoverAttachmentId, // Always use StatusFeedAttachment ID
          status,
          locale: locale || 'vi',
          seo: seoData ? seoData : undefined,
          excerpt: excerpt || undefined,
          authorName: authorName || undefined,
          publishedAt: publishedDate || undefined,
        },
        include: {
          content: {
            include: {
              author: {
                select: {
                  userId: true,
                  username: true,
                  email: true,
                  role: true,
                  name: true,
                  bio: true,
                  avatarUrl: true,
                },
              },
              tags: {
                include: {
                  tag: {
                    select: {
                      id: true,
                      name: true,
                    },
                  },
                },
              },
            },
          },
          category: {
            select: {
              id: true,
              name: true,
              slug: true,
              description: true,
            },
          },
          coverImage: {
            select: {
              id: true,
              mediaId: true,
              caption: true,
            },
          },
        },
      });

      // Create tags if provided
      if (tagIds && Array.isArray(tagIds) && tagIds.length > 0) {
        console.log('Processing tags:', tagIds);

        // Validate that tags exist
        const existingTags = await this.prisma.tag.findMany({
          where: {
            id: {
              in: tagIds,
            },
          },
          select: { id: true },
        });

        const existingTagIds = existingTags.map(tag => tag.id);
        const validTagIds = tagIds.filter(tagId => existingTagIds.includes(tagId));

        if (validTagIds.length !== tagIds.length) {
          console.log('Some tags do not exist. Original:', tagIds, 'Valid:', validTagIds);
        }

        if (validTagIds.length > 0) {
          const contentTags = validTagIds.map(tagId => ({
            contentId: content.id,
            tagId,
          }));
          console.log('Creating content tags:', contentTags);
          await this.prisma.contentTag.createMany({
            data: contentTags,
            skipDuplicates: true, // Skip if tag already exists for this content
          });
          console.log('Created content tags successfully');
        }
      } else {
        console.log('No tags provided or invalid tagIds:', tagIds);
      }

      // Fetch cover image filename if exists
      let coverImageFilename: string | null = null;
      if ((post as any).coverImage?.mediaId) {
        const media = await this.prisma.media.findUnique({
          where: { id: (post as any).coverImage.mediaId },
          select: { filename: true },
        });
        coverImageFilename = media?.filename || null;
      }

      // Fetch tags separately to ensure they are loaded correctly
      const contentTags = await this.prisma.contentTag.findMany({
        where: { contentId: content.id },
        include: {
          tag: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      // Transform the response
      const transformedPost = {
        ...post,
        coverImageId: coverImageFilename,
        category: (post as any).category,
        content: {
          ...post.content,
          tags: contentTags.map(ct => ct.tag),
        },
      };

      // Send notifications based on user role
      if (user.role === Role.ADMIN) {
        // If admin posts, send notifications to followers
        this.sendNewPostNotifications(authorId, post.id).catch((error) => {
          console.error('Failed to send new post notifications:', error);
        });
      } else {
        // If regular user posts, send notification to admin for review
        this.sendPostPendingReviewNotificationToAdmin(authorId, post.id, title).catch((error) => {
          console.error('Failed to send post pending review notification:', error);
        });
      }

      return transformedPost;
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Create post error: ${error.message}`);
        throw new RpcException(error.message);
      }
      this.logger.error(`Create post error: ${error}`);
      throw new RpcException('Failed to create post');
    }
  }

  public async sendNewPostNotifications(authorId: string, postId: string, type?: string) {
    // Get all followers of the author
    const followers = await this.prisma.follow.findMany({
      where: { followedId: authorId },
      select: { followerId: true },
    });

    console.log("Followers:", followers);

    // For each follower, send notification
    for (const follower of followers) {
      await this.notificationClient.emit('notification.create', {
        type: type || 'NEW_POST',
        actorId: authorId,
        objectType: 'post',
        objectId: postId,
        recipientId: follower.followerId,
        context: JSON.stringify({ postId }),
      });
    }
  }

  /**
   * Send notification to all admins when a regular user posts a new article
   * The post will be in PENDING_REVIEW status and needs admin approval
   */
  public async sendPostPendingReviewNotificationToAdmin(
    authorId: string,
    postId: string,
    postTitle: string,
  ) {
    try {
      // Get all admins
      const admins = await this.prisma.user.findMany({
        where: { role: Role.ADMIN },
        select: { userId: true },
      });

      // For each admin, send notification
      for (const admin of admins) {
        await this.notificationClient.emit('notification.create', {
          type: 'POST_PENDING_REVIEW',
          actorId: authorId,
          objectType: 'post',
          objectId: postId,
          recipientId: admin.userId,
          context: JSON.stringify({ postId, postTitle }),
        });
      }

      this.logger.log(
        `Sent post pending review notifications to ${admins.length} admin(s) for post ${postId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send post pending review notifications for post ${postId}:`,
        error,
      );
    }
  }

  async getPosts(skip = 0, take = 10) {
    try {
      const posts = await this.prisma.post.findMany({
        skip,
        take,
        where: {
          content: {
            deletedAt: null, // Exclude soft-deleted posts
          },
        },
        include: {
          content: {
            include: {
              author: {
                select: {
                  userId: true,
                  username: true,
                  email: true,
                  role: true,
                  name: true,
                  bio: true,
                  avatarUrl: true,
                },
              },
              tags: {
                include: {
                  tag: {
                    select: {
                      id: true,
                      name: true,
                    },
                  },
                },
              },
            },
          },
          category: {
            select: {
              id: true,
              name: true,
              slug: true,
              description: true,
            },
          },
        },
        orderBy: {
          content: { createdAt: 'desc' },
        },
      });

      // Transform posts
      const transformedPosts = await Promise.all(
        posts.map(async (post) => {
          // Fetch cover image filename if exists
          let coverImageFilename: string | null = null;
          if (post.coverImageId) {
            const attachment = await this.prisma.statusFeedAttachment.findUnique({
              where: { id: post.coverImageId },
              //@ts-ignore
              include: { media: true },
            });
            //@ts-ignore
            const rawFilename = attachment?.media?.filename || null;
            coverImageFilename = this.normalizeCoverImageFilename(rawFilename);
          }

          // Fetch tags separately
          const contentTags = await this.prisma.contentTag.findMany({
            where: { contentId: post.contentId },
            include: {
              tag: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          });

          // Strip HTML from bodyHtml
          if (post.bodyHtml) {
            post.bodyHtml = post.bodyHtml;
          }

          return {
            ...post,
            coverImageId: coverImageFilename,
            content: {
              ...post.content,
              authorId: undefined,
              author: post.content.author,
              tags: contentTags.map(ct => ct.tag),
            },
            category: post.category,
          };
        })
      );

      return transformedPosts;
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Get posts error: ${error.message}`);
        throw new RpcException(error.message);
      }
      this.logger.error(`Get posts error: ${error}`);
      throw new RpcException('Failed to get posts');
    }
  }

  async getRelatedPosts(postId: string, take: number = 3) {
    try {
      // Get the current post to find its category and tags
      const currentPost = await this.prisma.post.findUnique({
        where: { id: postId },
        include: {
          content: {
            include: {
              tags: {
                include: {
                  tag: true,
                },
              },
            },
          },
        },
      });

      if (!currentPost) {
        return [];
      }

      const tagIds = currentPost.content?.tags?.map((ct) => ct.tagId) || [];

      // Find related posts based on:
      // 1. Same category (highest priority)
      // 2. Shared tags (medium priority)
      // 3. Same locale (fallback)
      const relatedPosts = await this.prisma.post.findMany({
        where: {
          id: { not: postId }, // Exclude current post
          status: 'PUBLISHED',
          content: {
            deletedAt: null,
          },
          OR: [
            // Same category
            currentPost.categoryId ? { categoryId: currentPost.categoryId } : {},
            // Shared tags
            tagIds.length > 0
              ? {
                  content: {
                    tags: {
                      some: {
                        tagId: {
                          in: tagIds,
                        },
                      },
                    },
                  },
                }
              : {},
            // Same locale as fallback
            { locale: currentPost.locale || 'vi' },
          ],
        },
        include: {
          content: {
            include: {
              author: {
                select: {
                  userId: true,
                  username: true,
                  name: true,
                  avatarUrl: true,
                },
              },
              tags: {
                include: {
                  tag: true,
                },
              },
            },
          },
          coverImage: {
            include: {
              media: true,
            },
          },
          category: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
        orderBy: [
          { publishedAt: 'desc' },
        ],
        take: take,
      });

      // Process and return posts
      return relatedPosts.map((post) => {
        const rawCoverFilename =
          (post as any)?.coverImage?.media?.filename || null;
        const coverImageFilename =
          this.normalizeCoverImageFilename(rawCoverFilename);

        // Normalize body HTML
        const normalizedPost = this.parsePostHtml(post);
        
        return {
          ...normalizedPost,
          coverImageId: coverImageFilename,
          content: {
            ...normalizedPost.content,
            tags: post.content?.tags?.map((ct) => ct.tag) || [],
          },
        };
      });
    } catch (error) {
      this.logger.error(`Failed to get related posts for ${postId}:`, error);
      return [];
    }
  }

  async getPostById(id: string) {
    try {
      const post = await this.prisma.post.findUnique({
        where: { id },
        include: {
          content: {
            include: {
              author: {
                select: {
                  userId: true,
                  username: true,
                  email: true,
                  role: true,
                  name: true,
                  bio: true,
                  avatarUrl: true,
                },
              },
            },
          },
          category: {
            select: {
              id: true,
              name: true,
              slug: true,
              description: true,
            },
          },
        },
      });

      // Exclude soft-deleted posts
      if (!post || !post.content || (post.content as any)?.deletedAt) return null;

      // Fetch cover image filename if exists
      let coverImageFilename: string | null = null;
      if (post.coverImageId) {
        const attachment = await this.prisma.statusFeedAttachment.findUnique({
          where: { id: post.coverImageId },
          //@ts-ignore
          include: { media: true },
        });
        //@ts-ignore
        const rawFilename = attachment?.media?.filename || null;
        coverImageFilename = this.normalizeCoverImageFilename(rawFilename);
      }

      // Fetch tags separately
      const contentTags = await this.prisma.contentTag.findMany({
        where: { contentId: post.contentId },
        include: {
          tag: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      // Normalize image URLs in bodyHtml
      const normalizedPost = this.parsePostHtml(post);

      return {
        ...normalizedPost,
        coverImageId: coverImageFilename,
        content: {
          ...normalizedPost.content,
          authorId: undefined,
          author: normalizedPost.content.author,
          tags: contentTags.map(ct => ct.tag),
        },
        category: normalizedPost.category,
      };
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Get post by ID error: ${error.message}`);
        throw new RpcException(error.message);
      }
      this.logger.error(`Get post by ID error: ${error}`);
      throw new RpcException('Failed to get post');
    }
  }

  async incrementPostView(postId: string) {
    try {
      // Tìm post theo postId để lấy contentId
      const post = await this.prisma.post.findUnique({
        where: { id: postId },
        select: { contentId: true },
      });

      if (!post) {
        throw new RpcException('Post not found');
      }

      // Tăng view count cho content
      const content = await this.prisma.content.update({
        where: { id: post.contentId },
        data: {
          viewsCount: {
            increment: 1,
          },
        },
        select: {
          viewsCount: true,
        },
      });

      return {
        success: true,
        viewsCount: content.viewsCount,
      };
    } catch (error) {
      if (error instanceof RpcException) {
        throw error;
      }
      this.logger.error(`Failed to increment view count: ${error.message}`);
      throw new RpcException('Failed to increment view count');
    }
  }

  async getPostBySlug(slug: string, locale?: string) {
    try {
      // Normalize locale: default to 'vi' if not provided
      const requestedLocale = locale || 'vi';
      const fallbackLocale = requestedLocale === 'vi' ? 'en' : 'vi';

      // Try to find post with requested locale first
      let post = await this.prisma.post.findFirst({
        where: { 
          slug,
          locale: requestedLocale,
        },
        include: {
          content: {
            include: {
              author: {
                select: {
                  userId: true,
                  username: true,
                  email: true,
                  role: true,
                  name: true,
                  bio: true,
                  avatarUrl: true,
                },
              },
              tags: {
                include: {
                  tag: {
                    select: {
                      id: true,
                      name: true,
                    },
                  },
                },
              },
            },
          },
          category: {
            select: {
              id: true,
              name: true,
              slug: true,
              description: true,
            },
          },
        },
      });

      // If not found with requested locale, try fallback locale
      if (!post || !post.content || (post.content as any)?.deletedAt) {
        post = await this.prisma.post.findFirst({
          where: { 
            slug,
            locale: fallbackLocale,
          },
          include: {
            content: {
              include: {
                author: {
                  select: {
                    userId: true,
                    username: true,
                    email: true,
                    role: true,
                    name: true,
                    bio: true,
                    avatarUrl: true,
                  },
                },
                tags: {
                  include: {
                    tag: {
                      select: {
                        id: true,
                        name: true,
                      },
                    },
                  },
                },
              },
            },
            category: {
              select: {
                id: true,
                name: true,
                slug: true,
                description: true,
              },
            },
          },
        });
      }

      // If still not found, try without locale filter (for backward compatibility)
      if (!post || !post.content || (post.content as any)?.deletedAt) {
        post = await this.prisma.post.findUnique({
          where: { slug },
          include: {
            content: {
              include: {
                author: {
                  select: {
                    userId: true,
                    username: true,
                    email: true,
                    role: true,
                    name: true,
                    bio: true,
                    avatarUrl: true,
                  },
                },
                tags: {
                  include: {
                    tag: {
                      select: {
                        id: true,
                        name: true,
                      },
                    },
                  },
                },
              },
            },
            category: {
              select: {
                id: true,
                name: true,
                slug: true,
                description: true,
              },
            },
          },
        });
      }

      // Exclude soft-deleted posts
      if (!post || !post.content || (post.content as any)?.deletedAt) return null;

      // Fetch cover image filename if exists
      let coverImageFilename: string | null = null;
      if (post.coverImageId) {
        const attachment = await this.prisma.statusFeedAttachment.findUnique({
          where: { id: post.coverImageId },
          //@ts-ignore
          include: { media: true },
        });
        //@ts-ignore
        const rawFilename = attachment?.media?.filename || null;
        coverImageFilename = this.normalizeCoverImageFilename(rawFilename);
      }

      // Fetch tags separately
      const contentTags = await this.prisma.contentTag.findMany({
        where: { contentId: post.contentId },
        include: {
          tag: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      // Normalize image URLs in bodyHtml
      const normalizedPost = this.parsePostHtml(post);

      return {
        ...normalizedPost,
        coverImageId: coverImageFilename,
        content: {
          ...normalizedPost.content,
          authorId: undefined,
          author: normalizedPost.content.author,
          tags: contentTags.map(ct => ct.tag),
        },
        category: normalizedPost.category,
      };
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Get post by slug error: ${error.message}`);
        throw new RpcException(error.message);
      }
      this.logger.error(`Get post by slug error: ${error}`);
      throw new RpcException('Failed to get post');
    }
  }

  async updatePost(id: string, data: UpdatePostDto) {
    try {
      // Get existing post to merge SEO data
      const existingPost = await this.prisma.post.findUnique({
        where: { id },
        select: { bodyHtml: true, seo: true },
      });

      // Prepare SEO data
      let seoData = data.seo;
      if (seoData) {
        // Merge with existing SEO data if any
        const existingSEO = existingPost?.seo as SEOData | null;
        seoData = {
          ...existingSEO,
          ...seoData,
          // Auto-calculate reading time if bodyHtml changed
          readingTime: data.bodyHtml 
            ? this.calculateReadingTime(data.bodyHtml)
            : existingSEO?.readingTime || this.calculateReadingTime(existingPost?.bodyHtml),
        };
        seoData = this.prepareSEOData(seoData, data.bodyHtml || existingPost?.bodyHtml);
      }

      // Stringify bodyHtml if provided
      const updateData: any = {
        ...data,
        bodyHtml: data.bodyHtml ? this.stringifyHtml(data.bodyHtml) : undefined,
        seo: seoData || undefined,
      };

      // Remove undefined fields
      Object.keys(updateData).forEach(key => {
        if (updateData[key] === undefined) {
          delete updateData[key];
        }
      });

      // Validate slug uniqueness if slug is being updated
      if (data.slug !== undefined && data.slug !== null && data.slug !== '') {
        const existingPostWithSlug = await this.prisma.post.findFirst({
          where: {
            slug: data.slug,
            id: { not: id },
            content: {
              deletedAt: null,
            },
          },
        });
        if (existingPostWithSlug) {
          throw new BadRequestException('Post slug already exists');
        }
      }

      const post = await this.prisma.post.update({
        where: { id },
        data: updateData,
        include: {
          content: true,
          category: true,
        },
      });

      // Parse HTML before returning
      return this.parsePostHtml(post);
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Update post error: ${error.message}`);
        throw new RpcException(error.message);
      }
      this.logger.error(`Update post error: ${error}`);
      throw new RpcException('Failed to update post');
    }
  }

  async deletePost(id: string, deletedBy?: string) {
    try {
      // Get post with content to update
      const post = await this.prisma.post.findUnique({
        where: { id },
        include: { content: true },
      });

      if (!post) {
        throw new Error('Post not found');
      }

      // Soft delete: Update Content's deletedAt and deletedBy
      const updatedContent = await this.prisma.content.update({
        where: { id: post.contentId },
        data: {
          deletedAt: new Date(),
          deletedBy: deletedBy || null,
        },
      });

      this.logger.log(`Post ${id} soft deleted by ${deletedBy || 'system'}`);

      return {
        ...post,
        content: updatedContent,
      };
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Delete post error: ${error.message}`);
        throw new RpcException(error.message);
      }
      this.logger.error(`Delete post error: ${error}`);
      throw new RpcException('Failed to delete post');
    }
  }

  async getPostsByAuthor(authorId: string, skip = 0, take = 10) {
    try {
      const posts = await this.prisma.post.findMany({
        where: {
          content: {
            authorId,
            deletedAt: null, // Exclude soft-deleted posts
          },
        },
        skip,
        take,
        include: {
          content: true,
          category: true,
        },
        orderBy: {
          content: { createdAt: 'desc' },
        },
      });

      // Parse HTML in all posts before returning
      return this.parsePostsHtml(posts);
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Get posts by author error: ${error.message}`);
        throw new RpcException(error.message);
      }
      this.logger.error(`Get posts by author error: ${error}`);
      throw new RpcException('Failed to get posts');
    }
  }

  async getPostsByFilter(
    params: {
      userId?: string;
      category?: string; // category slug
      tagName?: string;
      title?: string;
      status?: string;
      locale?: string;
      categoryGroup?: string; // Filter by category group (ALL, BLOG, TOOL, TOOL_MARKETING, COURSE, LANDING_PAGE)
    },
    skip = 0,
    take = 10,
  ) {
    try {
      const { userId, category, tagName, title, status, locale, categoryGroup } = params;
      const requestedLocale = locale || 'vi';
      const fallbackLocale = requestedLocale === 'vi' ? 'en' : 'vi';

      // Build OR conditions - user requested 'match any' semantics
      const orConditions: any[] = [];
      if (userId) {
        orConditions.push({ content: { authorId: userId } });
      }
      if (category) {
        orConditions.push({ category: { slug: category } });
      }
      if (tagName) {
        orConditions.push({ content: { tags: { some: { tag: { name: tagName } } } } });
      }
      if (title) {
        orConditions.push({ title: { contains: title, mode: 'insensitive' } });
      }

      // Base where: only published posts
      // const finalStatus = status ?? "PUBLISHED";

      const where: any = {
        AND: [
          { status: status },
          { content: { 
            status: status,
            deletedAt: null, // Exclude soft-deleted posts
          } },
          // Try requested locale first, fallback to other locale or null
          {
            OR: [
              { locale: requestedLocale },
              { locale: fallbackLocale },
              { locale: null }, // For backward compatibility
            ],
          },
        ],
      };

      // Filter by category group if specified (and not ALL)
      if (categoryGroup && categoryGroup !== 'ALL') {
        where.AND.push({
          category: {
            OR: [
              { group: 'ALL' }, // Categories with group ALL are shown everywhere
              { group: categoryGroup }, // Categories with the specified group
            ],
          },
        });
      }

      if (orConditions.length > 0) {
        where.AND.push({ OR: orConditions });
      }

      const posts = await this.prisma.post.findMany({
        where,
        skip,
        take,
        include: {
          content: {
            include: {
              author: {
                select: {
                  userId: true,
                  username: true,
                  email: true,
                  role: true,
                  name: true,
                  bio: true,
                  avatarUrl: true,
                },
              },
              tags: {
                include: {
                  tag: {
                    select: {
                      id: true,
                      name: true,
                    },
                  },
                },
              },
            },
          },
          category: {
            select: {
              id: true,
              name: true,
              slug: true,
              description: true,
            },
          },
        },
        orderBy: {
          content: { createdAt: 'desc' },
        },
      });

      // Get total count for pagination
      const total = await this.prisma.post.count({ where });

      const transformedPosts = await Promise.all(
        posts.map(async (post) => {
          // Fetch cover image filename if exists
          let coverImageFilename: string | null = null;
          if (post.coverImageId) {
            const attachment = await this.prisma.statusFeedAttachment.findUnique({
              where: { id: post.coverImageId },
              //@ts-ignore
              include: { media: true },
            });
            //@ts-ignore
            const rawFilename = attachment?.media?.filename || null;
            coverImageFilename = this.normalizeCoverImageFilename(rawFilename);
          }

          // Fetch tags separately
          const contentTags = await this.prisma.contentTag.findMany({
            where: { contentId: post.contentId },
            include: {
              tag: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          });

          return {
            ...post,
            coverImageId: coverImageFilename,
            bodyHtml: post.bodyHtml,
            content: {
              ...post.content,
              authorId: undefined,
              author: post.content.author,
              tags: contentTags.map(ct => ct.tag),
            },
            category: post.category,
          };
        })
      );

      return {
        items: transformedPosts,
        total,
        page: Math.floor(skip / take) + 1,
        limit: take,
      };
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Get posts by filter error: ${error.message}`);
        throw new RpcException(error.message);
      }
      this.logger.error(`Get posts by filter error: ${error}`);
      throw new RpcException('Failed to get posts');
    }
  }

  async publishPost(id: string) {
    try {
      const post = await this.prisma.post.update({
        where: { id },
        data: {
          status: 'PUBLISHED',
          content: {
            update: {
              status: 'PUBLISHED',
            },
          },
        },
        include: {
          content: true,
          category: true,
        },
      });

      // Parse HTML before returning
      return this.parsePostHtml(post);
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Publish post error: ${error.message}`);
        throw new RpcException(error.message);
      }
      this.logger.error(`Publish post error: ${error}`);
      throw new RpcException('Failed to publish post');
    }
  }

  async sharePost(postId: string, userId: string) {
    try {
      // Check if post exists and is published
      const post = await this.prisma.post.findUnique({
        where: { id: postId },
        include: {
          content: {
            select: {
              id: true,
              status: true,
              sharesCount: true,
              deletedAt: true,
            },
          },
        },
      });

      if (!post || !post.content || (post.content as any)?.deletedAt) {
        throw new Error('Post not found');
      }

      // Type guard: post.content is guaranteed to exist after check
      const content = post.content;

      if (content.status !== 'PUBLISHED' || post.status !== 'PUBLISHED') {
        throw new Error('Post is not published');
      }

      // Create share record (refId is contentId)
      const share = await this.prisma.share.create({
        data: {
          userId,
          refId: post.contentId,
        },
      });

      // Increment sharesCount in content
      await this.prisma.content.update({
        where: { id: post.contentId },
        data: {
          sharesCount: {
            increment: 1,
          },
        },
      });

      // Return updated post with sharesCount
      return {
        message: 'Post shared successfully',
        share,
        sharesCount: post.content.sharesCount + 1,
      };
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Share post error: ${error.message}`);
        throw new RpcException(error.message);
      }
      this.logger.error(`Share post error: ${error}`);
      throw new RpcException('Failed to share post');
    }
  }

  async createComment(data: {
    refId: string;
    userId: string;
    bodyHtml?: string;
    parentCommentId?: string;
  }) {
    try {
      const { refId, userId, bodyHtml, parentCommentId } = data;

      // Validate parentCommentId if provided
      if (parentCommentId) {
        const parentExists = await this.prisma.comment.findUnique({
          where: { id: parentCommentId },
        });
        if (!parentExists) {
          throw new Error(`Parent comment with ID ${parentCommentId} not found`);
        }
      }

      // Create comment with targetType = POST
      const comment = await this.prisma.comment.create({
        data: {
          refId,
          userId,
          body: bodyHtml,
          parentCommentId: parentCommentId || null,
          targetType: 'COMMENT',
          status: 'PUBLISHED',
        },
        include: {
          user: {
            select: {
              userId: true,
              username: true,
              avatarUrl: true,
            },
          },
          parentComment: true,
          replies: true,
        },
      });

      // Increment commentsCount - find the post first to get contentId
      const post = await this.prisma.post.findUnique({
        where: { contentId: refId },
        select: { contentId: true },
      });

      if (!post) {
        throw new Error(`Post with ID ${refId} not found`);
      }

      await this.prisma.content.update({
        where: { id: post.contentId },
        data: {
          commentsCount: {
            increment: 1,
          },
        },
      });

      // Get updated comment count
      const updatedContent = await this.prisma.content.findUnique({
        where: { id: post.contentId },
        select: { commentsCount: true },
      });

      // Send notification
      await this.notificationClient.emit('blog.comment.created', {
        postId: refId,
        commentId: comment.id,
        commenterId: userId,
        authorId: null, // Will be determined in notification service
        commenterName: comment.user.username,
        commentsCount: updatedContent?.commentsCount || 0,
      });

      return {
        ...comment,
        commentsCount: updatedContent?.commentsCount || 0,
      };
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Create comment error: ${error.message}`);
        throw new RpcException(error.message);
      }
      this.logger.error(`Create comment error: ${error}`);
      throw new RpcException('Failed to create comment');
    }
  }

  async getCommentsList(
    pageNo = 0,
    pageSize = 5,
    status = 'PUBLISHED',
    sortBy = 'createdAt',
    sortType: 'asc' | 'desc' = 'desc',
    refId?: string,
  ) {
    try {
      const skip = pageNo * pageSize;
      const take = pageSize;

      // Build where clause
      const where: any = {
        status,
        targetType: 'COMMENT',
      };

      if (refId) {
        where.refId = refId;
      }

      // Build sort order
      const orderBy: any = {};
      if (sortBy === 'createdAt') {
        orderBy.createdAt = sortType;
      } else {
        orderBy[sortBy] = sortType;
      }

      // Get total count and paginated data
      const [data, total] = await Promise.all([
        this.prisma.comment.findMany({
          where,
          skip,
          take,
          include: {
            user: {
              select: {
                userId: true,
                username: true,
                avatarUrl: true,
              },
            },
            parentComment: true,
            replies: {
              include: {
                user: {
                  select: {
                    userId: true,
                    username: true,
                    avatarUrl: true,
                  },
                },
              },
            },
          },
          orderBy,
        }),
        this.prisma.comment.count({ where }),
      ]);

      return {
        data,
        total,
        pageNo,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      };
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Get comments list error: ${error.message}`);
        throw new RpcException(error.message);
      }
      this.logger.error(`Get comments list error: ${error}`);
      throw new RpcException('Failed to get comments');
    }
  }

  async getUserPosts(
    userId: string,
    pageNo = 0,
    pageSize = 10,
    status?: string,
    sortBy = 'createdAt',
    sortType: 'asc' | 'desc' = 'desc',
  ) {
    try {
      const skip = pageNo * pageSize;
      const take = pageSize;

      // Build where clause
      const where: any = {
        content: {
          authorId: userId,
        },
      };

      // Add status filter if provided
      if (status && status !== 'all') {
        where.status = status;
        where.content.status = status;
      }

      // Build sort order
      const orderBy: any = {};
      if (sortBy === 'createdAt' || sortBy === 'updatedAt') {
        orderBy.content = { [sortBy]: sortType };
      } else if (sortBy === 'title') {
        orderBy.title = sortType;
      } else {
        orderBy.content = { createdAt: sortType };
      }

      // Get total count and paginated data
      const [rawData, total] = await Promise.all([
        this.prisma.post.findMany({
          where,
          skip,
          take,
          include: {
            content: {
              include: {
                author: {
                  select: {
                    userId: true,
                    username: true,
                    email: true,
                    role: true,
                    name: true,
                    bio: true,
                    avatarUrl: true,
                  },
                },
                tags: {
                  include: {
                    tag: {
                      select: {
                        id: true,
                        name: true,
                      },
                    },
                  },
                },
              },
            },
            category: {
              select: {
                id: true,
                name: true,
                slug: true,
                description: true,
              },
            },
          },
          orderBy: {
            content: { createdAt: 'desc' },
          },
        }),
        this.prisma.post.count({ where }),
      ]);

      // Transform data
      const data = await Promise.all(
        rawData.map(async (post) => {
          // Fetch cover image filename if exists
          let coverImageFilename: string | null = null;
          if (post.coverImageId) {
            const attachment = await this.prisma.statusFeedAttachment.findUnique({
              where: { id: post.coverImageId },
              //@ts-ignore
              include: { media: true },
            });
            //@ts-ignore
            const rawFilename = attachment?.media?.filename || null;
            coverImageFilename = this.normalizeCoverImageFilename(rawFilename);
          }

          // Fetch author details
          const author = await this.prisma.user.findUnique({
            where: { userId: post.content.authorId },
            select: {
              userId: true,
              username: true,
              email: true,
              role: true,
              name: true,
              bio: true,
              avatarUrl: true,
            },
          });

          return {
            ...post,
            coverImageId: coverImageFilename,
            content: {
              ...post.content,
              authorId: undefined,
              author,
            },
            category: post.category,
          };
        })
      );

      return {
        data,
        total,
        pageNo,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      };
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Get user posts error: ${error.message}`);
        throw new RpcException(error.message);
      }
      this.logger.error(`Get user posts error: ${error}`);
      throw new RpcException('Failed to get user posts');
    }
  }

  async getUserActivity(
    userId: string,
    type: 'reacted' | 'commented' | 'shared' | 'all' = 'all',
    pageNo = 0,
    pageSize = 10,
  ) {
    try {
      const skip = pageNo * pageSize;
      const activities: any[] = [];

      // Fetch reactions if type matches
      if (type === 'reacted' || type === 'all') {
        const reactions = await this.prisma.reaction.findMany({
          where: {
            userId,
            targetType: 'POST',
          },
          include: {
            user: {
              select: {
                userId: true,
                username: true,
                avatarUrl: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        });

        // Fetch related posts for reactions
        const reactedPostIds = reactions.map((r) => r.refId);
        const reactedPosts = await this.prisma.content.findMany({
          where: { id: { in: reactedPostIds } },
          include: {
            post: {
              select: {
                id: true,
                title: true,
                slug: true,
              },
            },
            author: {
              select: {
                userId: true,
                username: true,
                avatarUrl: true,
              },
            },
          },
        });

        const postMap = new Map(reactedPosts.map((p: any) => [p.id, p]));

        reactions.forEach((reaction) => {
          const content = postMap.get(reaction.refId) as any;
          if (content && content.post && content.author) {
            activities.push({
              id: reaction.id,
              activityType: 'reacted',
              reactionType: reaction.reactionType,
              createdAt: reaction.createdAt,
              post: {
                id: content.post.id,
                title: content.post.title,
                slug: content.post.slug,
                author: content.author,
              },
            });
          }
        });
      }

      // Fetch comments if type matches
      if (type === 'commented' || type === 'all') {
        const comments = await this.prisma.comment.findMany({
          where: {
            userId,
            targetType: 'POST',
          },
          include: {
            user: {
              select: {
                userId: true,
                username: true,
                avatarUrl: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        });

        // Fetch related posts for comments
        const commentedPostIds = comments.map((c) => c.refId);
        const commentedPosts = await this.prisma.post.findMany({
          where: { id: { in: commentedPostIds } },
          include: {
            content: {
              include: {
                author: {
                  select: {
                    userId: true,
                    username: true,
                    avatarUrl: true,
                  },
                },
              },
            },
          },
        });

        const commentPostMap = new Map(commentedPosts.map((p: any) => [p.id, p]));

        comments.forEach((comment) => {
          const post = commentPostMap.get(comment.refId) as any;
          if (post && post.content && post.content.author) {
            activities.push({
              id: comment.id,
              activityType: 'commented',
              body: comment.body,
              createdAt: comment.createdAt,
              post: {
                id: post.id,
                title: post.title,
                slug: post.slug,
                author: post.content.author,
              },
            });
          }
        });
      }

      // Fetch shares if type matches
      if (type === 'shared' || type === 'all') {
        const shares = await this.prisma.share.findMany({
          where: { userId },
          include: {
            user: {
              select: {
                userId: true,
                username: true,
                avatarUrl: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        });

        // Fetch related posts for shares (refId = contentId)
        const sharedContentIds = shares.map((s) => s.refId);
        const sharedContents = await this.prisma.content.findMany({
          where: { id: { in: sharedContentIds } },
          include: {
            post: {
              select: {
                id: true,
                title: true,
                slug: true,
              },
            },
            author: {
              select: {
                userId: true,
                username: true,
                avatarUrl: true,
              },
            },
          },
        });

        const shareContentMap = new Map(sharedContents.map((c: any) => [c.id, c]));

        shares.forEach((share) => {
          const content = shareContentMap.get(share.refId) as any;
          if (content && content.post && content.author) {
            activities.push({
              id: share.id,
              activityType: 'shared',
              createdAt: share.createdAt,
              post: {
                id: content.post.id,
                title: content.post.title,
                slug: content.post.slug,
                author: content.author,
              },
            });
          }
        });
      }

      // Sort all activities by createdAt desc
      activities.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      // Apply pagination
      const total = activities.length;
      const paginatedData = activities.slice(skip, skip + pageSize);

      return {
        data: paginatedData,
        total,
        pageNo,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      };
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Get user activity error: ${error.message}`);
        throw new RpcException(error.message);
      }
      this.logger.error(`Get user activity error: ${error}`);
      throw new RpcException('Failed to get user activity');
    }
  }

  // ===== Reaction Methods =====

  async createReaction(postId: string, userId: string, reactionType: string = 'LIKE') {
    try {
      // Check if post exists and is published
      const post = await this.prisma.post.findUnique({
        where: { id: postId },
        include: {
          content: {
            select: {
              id: true,
              status: true,
              reactionsCount: true,
              authorId: true,
              deletedAt: true,
            },
          },
        },
      });

      if (!post || !post.content || (post.content as any)?.deletedAt) {
        throw new Error('Post not found');
      }

      // Type guard: post.content is guaranteed to exist after check
      const content = post.content;

      if (post.status !== 'PUBLISHED' || content.status !== 'PUBLISHED') {
        throw new Error('Post is not published');
      }

      // Check if user already reacted
      const existingReaction = await this.prisma.reaction.findFirst({
        where: {
          userId,
          refId: post.contentId,
          targetType: 'POST',
        },
      });

      if (existingReaction) {
        // Case 1: Same reaction type - delete the reaction (unreact)
        if (existingReaction.reactionType === reactionType) {
          await this.prisma.reaction.delete({
            where: { id: existingReaction.id },
          });

          // Decrement reactionsCount
          await this.prisma.content.update({
            where: { id: post.contentId },
            data: {
              reactionsCount: {
                decrement: 1,
              },
            },
          });

          return {
            action: 'unreacted',
            reaction: existingReaction,
            post: {
              id: post.id,
              title: post.title,
              reactionsCount: Math.max(0, post.content.reactionsCount - 1),
            },
          };
        }

        // Case 2: Different reaction type - update to new type
        const updatedReaction = await this.prisma.reaction.update({
          where: { id: existingReaction.id },
          data: {
            reactionType: reactionType as any,
          },
          include: {
            user: {
              select: {
                userId: true,
                username: true,
                avatarUrl: true,
              },
            },
          },
        });

        return {
          action: 'changed',
          reaction: updatedReaction,
          post: {
            id: post.id,
            title: post.title,
            reactionsCount: post.content.reactionsCount,
          },
        };
      }

      // Case 3: No existing reaction - create new
      const reaction = await this.prisma.reaction.create({
        data: {
          userId,
          refId: post.contentId,
          targetType: 'POST',
          reactionType: reactionType as any,
        },
        include: {
          user: {
            select: {
              userId: true,
              username: true,
              avatarUrl: true,
            },
          },
        },
      });

      // Increment reactionsCount
      await this.prisma.content.update({
        where: { id: post.contentId },
        data: {
          reactionsCount: {
            increment: 1,
          },
        },
      });

      // Send notification
      await this.notificationClient.emit('blog.reaction.created', {
        postId,
        reactionId: reaction.id,
        reactorId: userId,
        authorId: post.content.authorId,
        reactionType,
      });

      return {
        action: 'reacted',
        reaction,
        post: {
          id: post.id,
          title: post.title,
          reactionsCount: post.content.reactionsCount + 1,
        },
      };
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Create reaction error: ${error.message}`);
        throw new RpcException(error.message);
      }
      this.logger.error(`Create reaction error: ${error}`);
      throw new RpcException('Failed to create reaction');
    }
  }

  async updateReaction(postId: string, userId: string, reactionType: string) {
    try {
      // Check if post exists
      const post = await this.prisma.post.findUnique({
        where: { id: postId },
        include: {
          content: {
            select: {
              id: true,
              status: true,
              reactionsCount: true,
            },
          },
        },
      });

      if (!post) {
        throw new Error('Post not found');
      }

      // Find existing reaction
      const existingReaction = await this.prisma.reaction.findFirst({
        where: {
          userId,
          refId: post.contentId,
          targetType: 'POST',

        },
      });

      if (!existingReaction) {
        throw new Error('No reaction found. Use create endpoint first.');
      }

      // Update reaction type
      const updatedReaction = await this.prisma.reaction.update({
        where: { id: existingReaction.id },
        data: {
          reactionType: reactionType as any,
        },
        include: {
          user: {
            select: {
              userId: true,
              username: true,
              avatarUrl: true,
            },
          },
        },
      });

      return {
        action: 'changed',
        reaction: updatedReaction,
        post: {
          id: post.id,
          title: post.title,
          reactionsCount: post.content.reactionsCount,
        },
      };
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Update reaction error: ${error.message}`);
        throw new RpcException(error.message);
      }
      this.logger.error(`Update reaction error: ${error}`);
      throw new RpcException('Failed to update reaction');
    }
  }

  async deleteReaction(postId: string, userId: string) {
    try {
      // Check if post exists
      const post = await this.prisma.post.findUnique({
        where: { id: postId },
        include: {
          content: {
            select: {
              id: true,
              reactionsCount: true,
            },
          },
        },
      });

      if (!post) {
        throw new Error('Post not found');
      }

      // Find existing reaction
      const existingReaction = await this.prisma.reaction.findFirst({
        where: {
          userId,
          refId: post.contentId,
          targetType: 'POST',
        },
      });

      if (!existingReaction) {
        throw new Error('No reaction found to delete');
      }

      // Delete reaction
      await this.prisma.reaction.delete({
        where: { id: existingReaction.id },
      });

      // Decrement reactionsCount
      await this.prisma.content.update({
        where: { id: post.contentId },
        data: {
          reactionsCount: {
            decrement: 1,
          },
        },
      });

      return {
        action: 'unreacted',
        reaction: existingReaction,
        post: {
          id: post.id,
          title: post.title,
          reactionsCount: Math.max(0, post.content.reactionsCount - 1),
        },
      };
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Delete reaction error: ${error.message}`);
        throw new RpcException(error.message);
      }
      this.logger.error(`Delete reaction error: ${error}`);
      throw new RpcException('Failed to delete reaction');
    }
  }


  async checkUserReaction(contentId: string, userId: string) {
    try {
      // Check if user has reacted to this content
      const reaction = await this.prisma.reaction.findFirst({
        where: {
          userId,
          refId: contentId,
        },
      });

      if (!reaction) {
        return {
          hasReacted: false,
          reactionType: null,
        };
      }

      return {
        hasReacted: true,
        reactionType: reaction.reactionType,
      };
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Check user reaction error: ${error.message}`);
        throw new RpcException(error.message);
      }
      this.logger.error(`Check user reaction error: ${error}`);
      throw new RpcException('Failed to check user reaction');
    }
  }


  // ===== Homepage Features (migrated from homepage-service) =====

  async getCategories(group?: string) {
    try {
      const where: any = {
        deletedAt: null, // Exclude soft-deleted categories
      };
      
      // Filter by group if provided, default to ALL (show all categories)
      if (group && group !== 'ALL') {
        // Show categories with group ALL (show everywhere) or the specified group
        where.OR = [
          { group: 'ALL' },
          { group: group },
        ];
      } else {
        // If group is ALL or not provided, show all categories (no filter)
        // Categories with group ALL will be shown everywhere
      }
      
      const categories = await this.prisma.categories.findMany({
        where,
        select: { id: true, name: true, slug: true, description: true, group: true },
        orderBy: {
          name: 'asc',
        },
      });
      
      // Return categories with group field
      return categories.map(cat => ({
        id: cat.id,
        name: cat.name,
        slug: cat.slug,
        description: cat.description,
        group: cat.group || 'ALL', // Ensure group is always present
      }));
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Get categories error: ${error.message}`);
        throw new RpcException(error.message);
      }
      this.logger.error(`Get categories error: ${error}`);
      throw new RpcException('Failed to get categories');
    }
  }

  async createCategory(data: { name: string; slug: string; description?: string; group?: string }) {
    try {
      return await this.prisma.categories.create({
        data: {
          name: data.name,
          slug: data.slug,
          description: data.description,
          group: (data.group as any) || 'ALL', // Default to ALL if not provided
        },
      });
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Create category error: ${error.message}`);
        throw new RpcException(error.message);
      }
      this.logger.error(`Create category error: ${error}`);
      throw new RpcException('Failed to create category');
    }
  }

  async getCategoryById(id: string) {
    try {
      return await this.prisma.categories.findUnique({
        where: { id },
        select: { id: true, name: true, slug: true, description: true, group: true },
      });
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Get category by ID error: ${error.message}`);
        throw new RpcException(error.message);
      }
      this.logger.error(`Get category by ID error: ${error}`);
      throw new RpcException('Failed to get category');
    }
  }

  async updateCategory(id: string, data: { name?: string; slug?: string; description?: string; group?: string }) {
    try {
      const updateData: any = {};
      if (data.name !== undefined) updateData.name = data.name;
      if (data.slug !== undefined) updateData.slug = data.slug;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.group !== undefined) updateData.group = data.group;
      
      return await this.prisma.categories.update({
        where: { id },
        data: updateData,
      });
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Update category error: ${error.message}`);
        throw new RpcException(error.message);
      }
      this.logger.error(`Update category error: ${error}`);
      throw new RpcException('Failed to update category');
    }
  }

  async deleteCategory(id: string) {
    try {
      return await this.prisma.categories.delete({
        where: { id },
      });
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Delete category error: ${error.message}`);
        throw new RpcException(error.message);
      }
      this.logger.error(`Delete category error: ${error}`);
      throw new RpcException('Failed to delete category');
    }
  }

  async assignCategoryToPost(postId: string, categoryId: string) {
    try {
      // Kiểm tra post và category tồn tại
      const post = await this.prisma.post.findUnique({ where: { id: postId } });
      if (!post) throw new Error('Post not found');

      const category = await this.prisma.categories.findUnique({ where: { id: categoryId } });
      if (!category) throw new Error('Category not found');

      const updatedPost = await this.prisma.post.update({
        where: { id: postId },
        data: { categoryId },
      });

      // Parse HTML before returning
      return this.parsePostHtml(updatedPost);
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Assign category to post error: ${error.message}`);
        throw new RpcException(error.message);
      }
      this.logger.error(`Assign category to post error: ${error}`);
      throw new RpcException('Failed to assign category to post');
    }
  }

  async getAdminPosts(limit = 4) {
    try {
      const posts = await this.prisma.post.findMany({
        take: limit,
        include: {
          content: {
            include: {
              author: {
                select: { userId: true, username: true, name: true, role: true },
              },
              tags: {
                include: {
                  tag: {
                    select: {
                      id: true,
                      name: true,
                    },
                  },
                },
              },
            },
          },
          category: {
            select: { id: true, name: true, slug: true, description: true },
          },
        },
        where: {
          content: {
            author: {
              role: 'ADMIN',
            },
            status: 'PUBLISHED',
            deletedAt: null, // Exclude soft-deleted posts
          },
        },
        orderBy: {
          content: { createdAt: 'desc' },
        },
      });

      // Transform posts to include cover image filename
      const transformedPosts = await Promise.all(
        posts.map(async (post) => {
          // Fetch cover image filename if exists
          let coverImageFilename: string | null = null;
          if (post.coverImageId) {
            const attachment = await this.prisma.statusFeedAttachment.findUnique({
              where: { id: post.coverImageId },
              //@ts-ignore
              include: { media: true },
            });
            //@ts-ignore
            const rawFilename = attachment?.media?.filename || null;
            coverImageFilename = this.normalizeCoverImageFilename(rawFilename);
          }

          // Fetch tags separately
          const contentTags = await this.prisma.contentTag.findMany({
            where: { contentId: post.contentId },
            include: {
              tag: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          });

          return {
            ...post,
            coverImageId: coverImageFilename,
            bodyHtml: post.bodyHtml,
            content: {
              ...post.content,
              tags: contentTags.map(ct => ct.tag),
            },
          };
        })
      );

      return transformedPosts;
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Get admin posts error: ${error.message}`);
        throw new RpcException(error.message);
      }
      this.logger.error(`Get admin posts error: ${error}`);
      throw new RpcException('Failed to get admin posts');
    }
  }

  async getTopRatedTools(limit: number, sortBy: string) {
    try {
      // Tính avgRating từ ToolRating
      const tools = await (this.prisma as any).aiTool.findMany({
        take: limit,
        orderBy: sortBy === 'rating:desc' ? { avgRating: 'desc' } : { useCount: 'desc' },
        include: {
          ratings: {
            select: { stars: true },
            where: {
              deletedAt: null, // Exclude soft-deleted ratings
            },
          },
        },
      });

      // Tính avgRating nếu cần
      return tools.map((tool: any) => ({
        ...tool,
        avgRating: tool.ratings && tool.ratings.length
          ? tool.ratings.reduce((sum: number, r: any) => sum + r.stars, 0) / tool.ratings.length
          : 0,
      }));
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Get top rated tools error: ${error.message}`);
        throw new RpcException(error.message);
      }
      this.logger.error(`Get top rated tools error: ${error}`);
      throw new RpcException('Failed to get top rated tools');
    }
  }

  async getNewUserPosts(page: number, limit: number, category?: string, sortBy?: string) {
    try {
      const skip = (page - 1) * limit;
      const where: any = {
        status: 'PUBLISHED',
        content: {
          status: 'PUBLISHED'
        }
      };

      if (category) {
        where.category = { slug: category };
      }

      // Sắp xếp theo content.createdAt hoặc content.updatedAt
      const orderByField = sortBy === 'createdAt:desc' ? 'createdAt' : 'updatedAt';
      const orderBy = {
        content: {
          [orderByField]: 'desc' as const
        }
      };

      const [posts, total] = await Promise.all([
        this.prisma.post.findMany({
          where,
          skip,
          take: limit,
          orderBy,
          select: {
            id: true,
            title: true,
            slug: true,
            bodyHtml: true,
            coverImageId: true,
            status: true,
            seo: true,
            content: {
              select: {
                id: true,
                createdAt: true,
                updatedAt: true,
                viewsCount: true,
                reactionsCount: true,
                sharesCount: true,
                commentsCount: true,
                author: {
                  select: {
                    userId: true,
                    username: true,
                    name: true,
                    avatarUrl: true,
                  }
                },
                tags: {
                  select: {
                    tag: {
                      select: {
                        id: true,
                        name: true,
                      }
                    }
                  }
                }
              }
            },
            category: {
              select: {
                id: true,
                name: true,
                slug: true,
                description: true,
              }
            },
            coverImage: {
              select: {
                id: true,
                mediaId: true,
                caption: true,
              }
            }
          },
        }),
        this.prisma.post.count({ where }),
      ]);

      const strippedPosts = await Promise.all(posts.map(async (post) => {
        // Fetch tags separately - post.content is guaranteed to exist from include
        const contentId = (post as any).content?.id || (post as any).contentId;
        const contentTags = await this.prisma.contentTag.findMany({
          where: { contentId },
          include: {
            tag: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        });

        return {
          ...post,
          bodyHtml: post.bodyHtml,
          content: {
            ...post.content,
            tags: contentTags.map(ct => ct.tag),
          },
        };
      }));

      return {

        posts: this.parsePostsHtml(strippedPosts),

        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Get new user posts error: ${error.message}`);
        throw new RpcException(error.message);
      }
      this.logger.error(`Get new user posts error: ${error}`);
      throw new RpcException('Failed to get new user posts');
    }
  }

  async getFeaturedPosts(limit: number = 5) {
    try {
      const posts = await this.prisma.post.findMany({
        where: {
          status: 'PUBLISHED',
          content: {
            status: 'PUBLISHED'
          }
        },
        take: limit,
        orderBy: [
          {
            content: {
              viewsCount: 'desc'
            }
          },
          {
            content: {
              reactionsCount: 'desc'
            }
          },
          {
            content: {
              sharesCount: 'desc'
            }
          }
        ],
        select: {
          id: true,
          title: true,
          slug: true,
          bodyHtml: true,
          coverImageId: true,
          status: true,
          seo: true,
          content: {
            select: {
              id: true,
              createdAt: true,
              updatedAt: true,
              viewsCount: true,
              reactionsCount: true,
              sharesCount: true,
              commentsCount: true,
              author: {
                select: {
                  userId: true,
                  username: true,
                  name: true,
                  avatarUrl: true,
                }
              },
              tags: {
                select: {
                  tag: {
                    select: {
                      id: true,
                      name: true,
                    }
                  }
                }
              }
            }
          },
          category: {
            select: {
              id: true,
              name: true,
              slug: true,
              description: true,
            }
          },
          coverImage: {
            select: {
              id: true,
              mediaId: true,
              caption: true,
            }
          }
        },
      });

      // Parse HTML in all posts before returning
      const postsWithTags = await Promise.all(posts.map(async (post) => {
        // Fetch tags separately - post.content is guaranteed to exist from include
        const contentId = (post as any).content?.id || (post as any).contentId;
        const contentTags = await this.prisma.contentTag.findMany({
          where: { contentId },
          include: {
            tag: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        });

        return {
          ...post,
          content: {
            ...post.content,
            tags: contentTags.map(ct => ct.tag),
          },
        };
      }));

      return this.parsePostsHtml(postsWithTags);
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Get featured posts error: ${error.message}`);
        throw new RpcException(error.message);
      }
      this.logger.error(`Get featured posts error: ${error}`);
      throw new RpcException('Failed to get featured posts');
    }
  }

  // ===== ADMIN METHODS =====

  async getContentAdmin(query: {
    page?: number;
    limit?: number;
    search?: string;
    type?: string;
    status?: string;
  }): Promise<{ items: any[]; total: number }> {
    const { page = 0, limit = 20, search, type, status } = query;

    const where: any = {};

    if (search) {
      where.OR = [
        { post: { title: { contains: search, mode: 'insensitive' } } },
        { post: { bodyHtml: { contains: search, mode: 'insensitive' } } },
        { statusFeed: { body: { contains: search, mode: 'insensitive' } } },
      ];
    }

    if (type) {
      where.kind = type;
    }

    if (status) {
      where.status = status;
    }

    const [content, total] = await Promise.all([
      this.prisma.content.findMany({
        where,
        select: {
          id: true,
          kind: true,
          authorId: true,
          status: true,
          viewsCount: true,
          reactionsCount: true,
          sharesCount: true,
          commentsCount: true,
          scheduledAt: true,
          createdAt: true,
          updatedAt: true,
          createdBy: true,
          updatedBy: true,
          author: { select: { userId: true, username: true, name: true } },
          post: {
            select: {
              title: true,
              slug: true,
              bodyHtml: true,
              category: true,
            },
          },
          statusFeed: {
            select: {
              body: true,
              toolTag: true,
            },
          },
          tags: { include: { tag: true } },
        },
        skip: page * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.content.count({ where }),
    ]);

    return {
      items: content.map(item => ({
        ...item,
        post: item.post ? this.parsePostHtml(item.post) : null,
      })),
      total,
    };
  }

  async getContentByIdAdmin(contentId: string): Promise<any> {
    const content = await this.prisma.content.findUnique({
      where: { id: contentId },
      select: {
        id: true,
        kind: true,
        authorId: true,
        status: true,
        viewsCount: true,
        reactionsCount: true,
        sharesCount: true,
        commentsCount: true,
        scheduledAt: true,
        createdAt: true,
        updatedAt: true,
        createdBy: true,
        updatedBy: true,
        author: { select: { userId: true, username: true, name: true } },
        post: {
          select: {
            title: true,
            slug: true,
            bodyHtml: true,
            category: true,
          },
        },
        statusFeed: {
          select: {
            body: true,
            toolTag: true,
          },
        },
        tags: { include: { tag: true } },
      },
    });

    if (!content) {
      throw new RpcException('Content not found');
    }

    return {
      ...content,
      post: content.post ? this.parsePostHtml(content.post) : null,
    };
  }

  async updateContentAdmin(contentId: string, data: any): Promise<any> {
    const content = await this.prisma.content.findUnique({
      where: { id: contentId },
    });

    if (!content) {
      throw new RpcException('Content not found');
    }

    // Handle HTML stringification for post content
    if (data.bodyHtml) {
      data.bodyHtml = this.stringifyHtml(data.bodyHtml);
    }

    const updatedContent = await this.prisma.content.update({
      where: { id: contentId },
      data,
      select: {
        id: true,
        kind: true,
        authorId: true,
        status: true,
        viewsCount: true,
        reactionsCount: true,
        sharesCount: true,
        commentsCount: true,
        scheduledAt: true,
        createdAt: true,
        updatedAt: true,
        createdBy: true,
        updatedBy: true,
        author: { select: { userId: true, username: true, name: true } },
        post: {
          select: {
            title: true,
            slug: true,
            bodyHtml: true,
            category: true,
          },
        },
        statusFeed: {
          select: {
            body: true,
            toolTag: true,
          },
        },
        tags: { include: { tag: true } },
      },
    });

    return {
      ...updatedContent,
      post: updatedContent.post ? this.parsePostHtml(updatedContent.post) : null,
    };
  }

  async deleteContentAdmin(contentId: string): Promise<void> {
    const content = await this.prisma.content.findUnique({
      where: { id: contentId },
    });

    if (!content) {
      throw new RpcException('Content not found');
    }

    await this.prisma.content.delete({
      where: { id: contentId },
    });
  }

  async updatePostAdmin(postId: string, updateData: any) {
    try {
      this.logger.log(`[updatePostAdmin] Received update request for postId: ${postId}`);
      this.logger.log(`[updatePostAdmin] Update data keys: ${Object.keys(updateData).join(', ')}`);
      this.logger.log(`[updatePostAdmin] Update data: ${JSON.stringify(updateData, null, 2)}`);

      // Find the post to get contentId
      const post = await this.prisma.post.findUnique({
        where: { id: postId },
        select: { contentId: true },
      });

      if (!post) {
        throw new RpcException('Post not found');
      }
      
      // Get content to access authorId for creating StatusFeedAttachment
      const content = await this.prisma.content.findUnique({
        where: { id: post.contentId },
        select: { authorId: true },
      });

      // Separate Post fields from Content/other fields
      const { 
        status, 
        authorName, 
        excerpt, 
        publishedAt,
        locale,
        ...postUpdateData 
      } = updateData;
      
      // Add locale back to postUpdateData if provided
      if (locale !== undefined) {
        postUpdateData.locale = locale;
      }

      this.logger.log(`[updatePostAdmin] Extracted metadata fields:`, {
        authorName,
        excerpt,
        publishedAt,
        locale,
      });

      // Prepare Content update data if needed
      const contentUpdateData: any = {};
      if (status) {
        contentUpdateData.status = status;
      }

      // Update Content if needed
      if (Object.keys(contentUpdateData).length > 0) {
        await this.prisma.content.update({
          where: { id: post.contentId },
          data: contentUpdateData,
        });
      }

      // Update Post - include all Post model fields including new metadata fields
      const postData: any = {};
      if (status !== undefined) postData.status = status;
      if (postUpdateData.title !== undefined) postData.title = postUpdateData.title;
      
      // Validate slug uniqueness if slug is being updated
      if (postUpdateData.slug !== undefined && postUpdateData.slug !== null && postUpdateData.slug !== '') {
        const existingPostWithSlug = await this.prisma.post.findFirst({
          where: {
            slug: postUpdateData.slug,
            id: { not: postId },
            content: {
              deletedAt: null,
            },
          },
        });
        if (existingPostWithSlug) {
          throw new BadRequestException('Post slug already exists');
        }
        postData.slug = postUpdateData.slug;
      }
      if (postUpdateData.bodyHtml !== undefined) postData.bodyHtml = postUpdateData.bodyHtml;
      if (postUpdateData.categoryId !== undefined) postData.categoryId = postUpdateData.categoryId;
      if (postUpdateData.seo !== undefined) postData.seo = postUpdateData.seo;
      
      // Validate and set coverImageId
      if (postUpdateData.coverImageId !== undefined) {
        this.logger.log(`[updatePostAdmin] Processing coverImageId: ${postUpdateData.coverImageId} (type: ${typeof postUpdateData.coverImageId})`);
        
        // Allow null to clear cover image
        if (postUpdateData.coverImageId === null || postUpdateData.coverImageId === 'null') {
          this.logger.log(`[updatePostAdmin] Setting coverImageId to null to clear cover image`);
          postData.coverImageId = null;
        } else if (postUpdateData.coverImageId) {
          // Check if coverImageId is already a StatusFeedAttachment ID
          let attachment = await this.prisma.statusFeedAttachment.findUnique({
            where: { id: postUpdateData.coverImageId },
            select: { id: true },
          });
          
          if (attachment) {
            this.logger.log(`[updatePostAdmin] ✅ coverImageId is already a StatusFeedAttachment ID: ${postUpdateData.coverImageId}`);
            postData.coverImageId = postUpdateData.coverImageId;
          } else {
            // It's a Media ID, need to create StatusFeedAttachment
            this.logger.log(`[updatePostAdmin] coverImageId is a Media ID, creating StatusFeedAttachment...`);
            
            // Verify media exists (with retry for eventual consistency)
            let media: { id: string } | null = null;
            const maxRetries = 3;
            const retryDelay = 100; // 100ms
            
            for (let attempt = 1; attempt <= maxRetries; attempt++) {
              try {
                this.logger.log(`[updatePostAdmin] Verifying media exists (attempt ${attempt}/${maxRetries}): ${postUpdateData.coverImageId}`);
                media = await this.prisma.media.findUnique({
                  where: { id: postUpdateData.coverImageId },
                  select: { id: true },
                });
                
                if (media) {
                  this.logger.log(`[updatePostAdmin] ✅ Verified media exists: ${postUpdateData.coverImageId}`);
                  break;
                } else if (attempt < maxRetries) {
                  this.logger.warn(`[updatePostAdmin] Media not found, retrying in ${retryDelay}ms...`);
                  await new Promise(resolve => setTimeout(resolve, retryDelay));
                }
              } catch (error) {
                this.logger.error(`[updatePostAdmin] Error verifying media (attempt ${attempt}):`, error);
                if (attempt === maxRetries) {
                  throw error;
                }
                await new Promise(resolve => setTimeout(resolve, retryDelay));
              }
            }
            
            if (!media) {
              this.logger.error(`[updatePostAdmin] ❌ Media not found after ${maxRetries} attempts: ${postUpdateData.coverImageId}`);
              throw new RpcException(`Media with ID ${postUpdateData.coverImageId} not found`);
            }
            
            // Ensure a StatusFeed exists for this post's content
            let statusFeed = await this.prisma.statusFeed.findUnique({
              where: { contentId: post.contentId },
            });
            
            if (!statusFeed) {
              this.logger.log(`[updatePostAdmin] Creating StatusFeed for content: ${post.contentId}`);
              statusFeed = await this.prisma.statusFeed.create({
                data: {
                  contentId: post.contentId,
                  privacyInt: 1, // public
                },
              });
              this.logger.log(`[updatePostAdmin] Created StatusFeed: ${statusFeed.id}`);
            } else {
              this.logger.log(`[updatePostAdmin] Found existing StatusFeed: ${statusFeed.id}`);
            }
            
            // Create StatusFeedAttachment
            attachment = await this.prisma.statusFeedAttachment.create({
              data: {
                statusId: statusFeed.id,
                mediaId: postUpdateData.coverImageId,
                createdBy: content?.authorId || null,
              },
            });
            
            this.logger.log(`[updatePostAdmin] ✅ Created StatusFeedAttachment: ${attachment.id} for Media: ${postUpdateData.coverImageId}`);
            postData.coverImageId = attachment.id;
          }
        }
      }
      
      // New metadata fields
      if (excerpt !== undefined) {
        postData.excerpt = excerpt || null;
        this.logger.log(`[updatePostAdmin] Setting excerpt: ${excerpt}`);
      }
      if (authorName !== undefined) {
        postData.authorName = authorName || null;
        this.logger.log(`[updatePostAdmin] Setting authorName: ${authorName}`);
      }
      if (publishedAt !== undefined) {
        postData.publishedAt = publishedAt ? new Date(publishedAt) : null;
        this.logger.log(`[updatePostAdmin] Setting publishedAt: ${publishedAt} -> ${postData.publishedAt}`);
      }
      if (postUpdateData.locale !== undefined) {
        postData.locale = postUpdateData.locale || 'vi';
        this.logger.log(`[updatePostAdmin] Setting locale: ${postUpdateData.locale}`);
      }

      this.logger.log(`[updatePostAdmin] Final postData to update: ${JSON.stringify(postData, null, 2)}`);

      if (Object.keys(postData).length > 0) {
        const result = await this.prisma.post.update({
          where: { id: postId },
          data: postData,
        });
        this.logger.log(`[updatePostAdmin] ✅ Post updated successfully. New values:`, {
          excerpt: result.excerpt,
          authorName: result.authorName,
          publishedAt: result.publishedAt,
        });
      } else {
        this.logger.warn(`[updatePostAdmin] ⚠️ No fields to update`);
      }

      // Return updated post with content
      const updatedPost = await this.prisma.post.findUnique({
        where: { id: postId },
        include: {
          content: {
            include: {
              author: {
                select: {
                  userId: true,
                  username: true,
                  name: true,
                  role: true,
                },
              },
              tags: {
                include: { tag: true },
              },
            },
          },
          category: true,
        },
      });

      return this.parsePostHtml(updatedPost);
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Update post admin error: ${error.message}`);
        throw new RpcException(error.message);
      }
      this.logger.error(`Update post admin error: ${error}`);
      throw new RpcException('Failed to update post');
    }
  }

  async countPosts(): Promise<number> {
    try {
      return await this.prisma.post.count();
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Count posts error: ${error.message}`);
        throw new RpcException(error.message);
      }
      this.logger.error(`Count posts error: ${error}`);
      throw new RpcException('Failed to count posts');
    }
  }

  // ===== ADMIN PUBLISH POST =====

  /**
   * Admin API: Publish a post to PUBLISHED status and send notifications to followers
   * This method updates the post status to PUBLISHED and triggers notifications
   * to all followers of the post author
   */
  async publishPostAdmin(postId: string): Promise<any> {
    try {
      // Find the post with author info
      const post = await this.prisma.post.findUnique({
        where: { id: postId },
        include: {
          content: {
            include: {
              author: {
                select: {
                  userId: true,
                  username: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
      });

      if (!post) {
        throw new RpcException('Post not found');
      }

      // Update post status to PUBLISHED in both Post and Content tables
      await this.prisma.content.update({
        where: { id: post.contentId },
        data: { status: 'PUBLISHED' },
      });

      await this.prisma.post.update({
        where: { id: postId },
        data: { status: 'PUBLISHED' },
      });

      // Get updated post
      await this.prisma.post.findUnique({
        where: { id: postId },
        include: {
          content: {
            include: {
              author: {
                select: {
                  userId: true,
                  username: true,
                  email: true,
                  name: true,
                  bio: true,
                  role: true,
                },
              },
              tags: {
                include: {
                  tag: {
                    select: {
                      id: true,
                      name: true,
                    },
                  },
                },
              },
            },
          },
          category: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
      });

      // Send notifications to all followers of the author
      this.sendNewPostNotifications(post.content.authorId, postId, 'NEW_POST_FROM_FOLLOWING').catch((error) => {
        this.logger.error('Failed to send new post notifications:', error);
      });

      this.logger.log(`Post ${postId} published and notifications sent to followers`);

      return true;
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Publish post admin error: ${error.message}`);
        throw new RpcException(error.message);
      }
      this.logger.error(`Publish post admin error: ${error}`);
      throw new RpcException('Failed to publish post');
    }
  }

  /**
   * Increment view count for a post
   * Updates the viewsCount in Content table by 1
   */
  async updatePostView(postId: string) {
    try {
      // Get the post first to find its contentId
      const post = await this.prisma.post.findUnique({
        where: { id: postId },
        select: {
          contentId: true,
          id: true,
          title: true,
        },
      });

      if (!post) {
        throw new Error('Post not found');
      }

      // Increment viewsCount in Content table
      const updatedContent = await this.prisma.content.update({
        where: { id: post.contentId },
        data: {
          viewsCount: {
            increment: 1,
          },
        },
        select: {
          id: true,
          viewsCount: true,
        },
      });

      this.logger.log(`Post ${postId} view updated. Total views: ${updatedContent.viewsCount}`);

      return {
        postId,
        contentId: post.contentId,
        viewsCount: updatedContent.viewsCount,
      };
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Update post view error: ${error.message}`);
        throw new RpcException(error.message);
      }
      this.logger.error(`Update post view error: ${error}`);
      throw new RpcException('Failed to update post view');
    }
  }

  // ===== StatusFeedAttachment Creation =====

  async checkIfAttachmentExists(attachmentId: string): Promise<boolean> {
    try {
      const attachment = await this.prisma.statusFeedAttachment.findUnique({
        where: { id: attachmentId },
      });
      return !!attachment;
    } catch (error) {
      return false;
    }
  }

  async createStatusFeedAttachment(mediaId: string, userId: string) {
    try {
      // Verify media exists
      const media = await this.prisma.media.findUnique({
        where: { id: mediaId },
      });

      if (!media) {
        throw new Error(`Media not found: ${mediaId}`);
      }

      // Create Content first (required for StatusFeed foreign key)
      const content = await this.prisma.content.create({
        data: {
          kind: 'status',
          authorId: userId,
          status: 'PUBLISHED',
          createdBy: userId,
        },
      });

      // Create StatusFeed with the contentId
      const statusFeed = await this.prisma.statusFeed.create({
        data: {
          contentId: content.id,
          privacyInt: 1, // public
        },
      });

      // Create the attachment
      const attachment = await this.prisma.statusFeedAttachment.create({
        data: {
          statusId: statusFeed.id,
          mediaId: mediaId,
          createdBy: userId,
        },
      });

      this.logger.log(`Created StatusFeedAttachment: ${attachment.id}`);
      return attachment;
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Create attachment error: ${error.message}`);
        throw new RpcException(error.message);
      }
      this.logger.error(`Create attachment error: ${error}`);
      throw new RpcException('Failed to create attachment');
    }
  }
}
