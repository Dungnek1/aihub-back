import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@app/database';
import { RpcException } from '@nestjs/microservices';

interface CreateContactInfoDto {
    categoryId: string;
    title: string;
    description?: string;
    value: string;
}

interface UpdateContactInfoDto {
    title?: string;
    description?: string;
    value?: string;
}

@Injectable()
export class SupportContactInfoService {
    private readonly logger = new Logger(SupportContactInfoService.name);

    constructor(private readonly prisma: PrismaService) { }

    async createContactInfo(data: CreateContactInfoDto) {
        try {
            this.logger.log(`Creating contact info for category: ${data.categoryId}`);

            // Verify category exists
            const category = await this.prisma.supportIssueCategory.findUnique({
                where: { id: data.categoryId },
            });

            if (!category) {
                throw new Error(`Category with ID ${data.categoryId} not found`);
            }

            const contactInfo = await this.prisma.supportContactInfo.create({
                data: {
                    categoryId: data.categoryId,
                    title: data.title,
                    description: data.description || null,
                    value: data.value,
                },
            });

            this.logger.log(`Contact info created with ID: ${contactInfo.id}`);
            return contactInfo;
        } catch (error) {
            this.logger.error(`Failed to create contact info: ${error.message}`);
            throw new RpcException(error.message);
        }
    }

    async getContactInfoByCategory(categoryId: string, skip = 0, take = 10) {
        try {
            this.logger.log(
                `Fetching contact info for category: ${categoryId} - skip: ${skip}, take: ${take}`,
            );

            const [infos, total] = await Promise.all([
                this.prisma.supportContactInfo.findMany({
                    where: { categoryId },
                    skip,
                    take,
                    orderBy: { createdAt: 'asc' },
                }),
                this.prisma.supportContactInfo.count({ where: { categoryId } }),
            ]);

            return {
                data: infos,
                total,
                skip,
                take,
            };
        } catch (error) {
            this.logger.error(`Failed to fetch contact info: ${error.message}`);
            throw new RpcException(error.message);
        }
    }

    async getContactInfo(id: string) {
        try {
            this.logger.log(`Fetching contact info: ${id}`);

            const contactInfo = await this.prisma.supportContactInfo.findUnique({
                where: { id },
            });

            if (!contactInfo) {
                throw new Error(`Contact info with ID ${id} not found`);
            }

            return contactInfo;
        } catch (error) {
            this.logger.error(`Failed to fetch contact info: ${error.message}`);
            throw new RpcException(error.message);
        }
    }

    async updateContactInfo(id: string, data: UpdateContactInfoDto) {
        try {
            this.logger.log(`Updating contact info: ${id}`);

            const contactInfo = await this.prisma.supportContactInfo.update({
                where: { id },
                data: {
                    title: data.title,
                    description: data.description,
                    value: data.value,
                },
            });

            this.logger.log(`Contact info ${id} updated`);
            return contactInfo;
        } catch (error) {
            this.logger.error(`Failed to update contact info: ${error.message}`);
            throw new RpcException(error.message);
        }
    }

    async deleteContactInfo(id: string) {
        try {
            this.logger.log(`Deleting contact info: ${id}`);

            const contactInfo = await this.prisma.supportContactInfo.delete({
                where: { id },
            });

            this.logger.log(`Contact info ${id} deleted`);
            return contactInfo;
        } catch (error) {
            this.logger.error(`Failed to delete contact info: ${error.message}`);
            throw new RpcException(error.message);
        }
    }

    async deleteContactInfoByCategory(categoryId: string) {
        try {
            this.logger.log(
                `Deleting all contact info for category: ${categoryId}`,
            );

            const result = await this.prisma.supportContactInfo.deleteMany({
                where: { categoryId },
            });

            this.logger.log(
                `Deleted ${result.count} contact info records for category ${categoryId}`,
            );
            return result;
        } catch (error) {
            this.logger.error(
                `Failed to delete contact info by category: ${error.message}`,
            );
            throw new RpcException(error.message);
        }
    }

    async getAllContactInfo(skip = 0, take = 10) {
        try {
            this.logger.log(
                `Fetching all contact info - skip: ${skip}, take: ${take}`,
            );

            const [infos, total] = await Promise.all([
                this.prisma.supportContactInfo.findMany({
                    skip,
                    take,
                    include: {
                        category: true,
                    },
                    orderBy: { createdAt: 'desc' },
                }),
                this.prisma.supportContactInfo.count(),
            ]);

            return {
                data: infos,
                total,
                skip,
                take,
            };
        } catch (error) {
            this.logger.error(`Failed to fetch all contact info: ${error.message}`);
            throw new RpcException(error.message);
        }
    }
}
