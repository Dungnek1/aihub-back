import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@app/database';
import { RpcException } from '@nestjs/microservices';
import { ContactRequestStatus } from '@prisma/client';

interface CreateContactRequestDto {
    name: string;
    email: string;
    phone?: string;
    message: string;
    source?: 'HOME' | 'LANDING_PAGE';
}

interface UpdateContactRequestDto {
    status: string;
}

@Injectable()
export class SupportContactRequestService {
    private readonly logger = new Logger(SupportContactRequestService.name);

    constructor(private readonly prisma: PrismaService) { }

    async createContactRequest(data: CreateContactRequestDto) {
        try {
            this.logger.log(`Creating contact request for email: ${data.email}`);

            const contactRequest = await this.prisma.supportContactRequest.create({
                data: {
                    name: data.name,
                    email: data.email,
                    phone: data.phone || null,
                    message: data.message,
                    source: data.source || 'HOME', // Default to HOME if not provided
                    // status defaults to NEW from schema
                },
            });

            this.logger.log(`Contact request created with ID: ${contactRequest.id}`);
            return contactRequest;
        } catch (error) {
            this.logger.error(`Failed to create contact request: ${error.message}`);
            throw new RpcException(error.message);
        }
    }

    async getContactRequests(skip = 0, take = 10) {
        try {
            this.logger.log(`Fetching contact requests - skip: ${skip}, take: ${take}`);

            const [requests, total] = await Promise.all([
                this.prisma.supportContactRequest.findMany({
                    where: { deletedAt: null },
                    skip,
                    take,
                    orderBy: { createdAt: 'desc' },
                }),
                this.prisma.supportContactRequest.count({ where: { deletedAt: null } }),
            ]);

            return {
                data: requests,
                total,
                skip,
                take,
            };
        } catch (error) {
            this.logger.error(`Failed to fetch contact requests: ${error.message}`);
            throw new RpcException(error.message);
        }
    }

    async getContactRequestsAdmin(query: {
        pageNo?: number;
        pageSize?: number;
        status?: string;
    }) {
        try {
            const pageNo = query.pageNo || 0;
            const pageSize = query.pageSize || 20;
            const { status } = query;

            const where: any = {
                deletedAt: null, // Exclude soft-deleted contact requests
            };

            if (status) {
                where.status = status as ContactRequestStatus;
            }

            this.logger.log(`Fetching contact requests admin - pageNo: ${pageNo}, pageSize: ${pageSize}, status: ${status}`);

            const [requests, total] = await Promise.all([
                this.prisma.supportContactRequest.findMany({
                    where,
                    skip: pageNo * pageSize,
                    take: pageSize,
                    orderBy: { createdAt: 'desc' },
                }),
                this.prisma.supportContactRequest.count({ where }),
            ]);

            return {
                contactRequests: requests,
                pagination: {
                    pageNo,
                    pageSize,
                    total,
                    totalPages: Math.ceil(total / pageSize),
                },
            };
        } catch (error) {
            this.logger.error(`Failed to fetch contact requests admin: ${error.message}`);
            throw new RpcException(error.message);
        }
    } async getContactRequestById(id: string) {
        try {
            this.logger.log(`Fetching contact request: ${id}`);

            const contactRequest = await this.prisma.supportContactRequest.findUnique({
                where: { id },
            });

            if (!contactRequest || contactRequest.deletedAt !== null) {
                throw new Error(`Contact request with ID ${id} not found`);
            }

            return contactRequest;
        } catch (error) {
            this.logger.error(`Failed to fetch contact request: ${error.message}`);
            throw new RpcException(error.message);
        }
    }

    async updateContactRequestStatus(id: string, data: UpdateContactRequestDto) {
        try {
            this.logger.log(
                `Updating contact request ${id} status to ${data.status}`,
            );

            const contactRequest = await this.prisma.supportContactRequest.update({
                where: { id },
                data: {
                    status: data.status as ContactRequestStatus,
                },
            });

            this.logger.log(`Contact request ${id} status updated`);
            return contactRequest;
        } catch (error) {
            this.logger.error(
                `Failed to update contact request status: ${error.message}`,
            );
            throw new RpcException(error.message);
        }
    }

    async getContactRequestsByStatus(status: string, skip = 0, take = 10) {
        try {
            this.logger.log(
                `Fetching contact requests with status: ${status} - skip: ${skip}, take: ${take}`,
            );

            const [requests, total] = await Promise.all([
                this.prisma.supportContactRequest.findMany({
                    where: { status: status as ContactRequestStatus, deletedAt: null },
                    skip,
                    take,
                    orderBy: { createdAt: 'desc' },
                }),
                this.prisma.supportContactRequest.count({ where: { status: status as ContactRequestStatus, deletedAt: null } }),
            ]);

            return {
                data: requests,
                total,
                skip,
                take,
            };
        } catch (error) {
            this.logger.error(`Failed to fetch contact requests by status: ${error.message}`);
            throw new RpcException(error.message);
        }
    } async deleteContactRequest(id: string) {
        try {
            this.logger.log(`Deleting contact request: ${id}`);

            const contactRequest = await this.prisma.supportContactRequest.update({
                where: { id },
                data: {
                    deletedAt: new Date(),
                    deletedBy: null,
                },
            });

            this.logger.log(`Contact request ${id} soft deleted`);
            return contactRequest;
        } catch (error) {
            this.logger.error(`Failed to delete contact request: ${error.message}`);
            throw new RpcException(error.message);
        }
    }
}
