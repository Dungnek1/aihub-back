import { Controller, NotFoundException } from '@nestjs/common';
import { MessagePattern, Payload, RpcException } from '@nestjs/microservices';
import { CourseService } from '../service/course.service';
import { CourseRatingService } from '../service/course-rating.service';
import { CreateCourseDto, UpdateCourseDto, CreateCourseRatingDto } from '../dto/course.dto';

@Controller()
export class CourseServiceController {
  constructor(
    private readonly courseService: CourseService,
    private readonly ratingService: CourseRatingService,
  ) { }

  // ===== COURSE PATTERNS =====

  @MessagePattern('course.create')
  async createCourse(@Payload() data: CreateCourseDto) {
    return this.courseService.createCourse(data);
  }

  @MessagePattern('course.getAll')
  async getAllCourses(@Payload() data: { skip: number; take: number; status?: string; isFeatured?: boolean }) {
    return this.courseService.getAllCourses(data.skip, data.take, data.status, data.isFeatured);
  }

  @MessagePattern('course.getById')
  async getCourseById(@Payload() data: { id: string }) {
    try {
      return await this.courseService.getCourseById(data.id);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw new RpcException({ statusCode: 404, message: error.message });
      }
      throw error;
    }
  }

  @MessagePattern('course.getBySlug')
  async getCourseBySlug(@Payload() data: { slug: string }) {
    try {
      return await this.courseService.getCourseBySlug(data.slug);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw new RpcException({ statusCode: 404, message: error.message });
      }
      throw error;
    }
  }

  @MessagePattern('course.update')
  async updateCourse(@Payload() data: any) {
    const { id, ...updateData } = data;
    return this.courseService.updateCourse(id, updateData);
  }

  @MessagePattern('course.delete')
  async deleteCourse(@Payload() data: { id: string; deletedBy: string }) {
    return this.courseService.deleteCourse(data.id, data.deletedBy);
  }

  @MessagePattern('course.publish')
  async publishCourse(@Payload() data: { id: string; status: string; updatedBy: string }) {
    return this.courseService.publishCourse(data.id, data.updatedBy);
  }

  @MessagePattern('course.getByInstructor')
  async getCoursesByInstructor(@Payload() data: { instructorId: string; skip: number; take: number }) {
    return this.courseService.getCoursesByInstructor(data.instructorId, data.skip, data.take);
  }

  @MessagePattern('course.incrementView')
  async incrementCourseView(@Payload() data: { id: string }) {
    return this.courseService.incrementCourseView(data.id);
  }

  @MessagePattern('course.getFeatured')
  async getFeaturedCourses(@Payload() data: { limit?: number }) {
    return this.courseService.getFeaturedCourses(data.limit || 4);
  }

  @MessagePattern('course.count')
  async countCourses() {
    return this.courseService.count();
  }

  // ===== COURSE RATING PATTERNS =====

  @MessagePattern('course.rate')
  async rateCourse(@Payload() data: any) {
    const { courseId, userId, createdBy, ...ratingData } = data;
    return this.ratingService.createRating(courseId, userId, ratingData, createdBy);
  }

  @MessagePattern('course.rating.update')
  async updateRating(@Payload() data: any) {
    const { id, userId, updatedBy, ...ratingData } = data;
    return this.ratingService.updateRating(id, userId, ratingData, updatedBy);
  }

  @MessagePattern('course.rating.delete')
  async deleteRating(@Payload() data: { id: string; userId: string; deletedBy: string }) {
    return this.ratingService.deleteRating(data.id, data.userId, data.deletedBy);
  }

  @MessagePattern('course.getRatings')
  async getCourseRatings(@Payload() data: { courseId: string; skip: number; take: number }) {
    return this.ratingService.getCourseRatings(data.courseId, data.skip, data.take);
  }

  @MessagePattern('course.getAverageRating')
  async getAverageRating(@Payload() data: { courseId: string }) {
    return this.ratingService.getAverageRating(data.courseId);
  }

  @MessagePattern('course.use')
  async markCourseAsUsed(@Payload() data: { userId: string; courseId: string }) {
    return this.courseService.markCourseAsUsed(data.userId, data.courseId);
  }

  @MessagePattern('course.save')
  async toggleSaveCourse(@Payload() data: { userId: string; courseId: string }) {
    return this.courseService.toggleSaveCourse(data.userId, data.courseId);
  }

  @MessagePattern('course.get-used')
  async getUserUsedCourses(@Payload() data: { userId: string; pageNo?: number; pageSize?: number }) {
    return this.courseService.getUserUsedCourses(data.userId, data.pageNo, data.pageSize);
  }

  @MessagePattern('course.get-saved')
  async getUserSavedCourses(@Payload() data: { userId: string; pageNo?: number; pageSize?: number }) {
    return this.courseService.getUserSavedCourses(data.userId, data.pageNo, data.pageSize);
  }

  @MessagePattern('admin.getCourses')
  async getCoursesAdmin(@Payload() data: { pageNo?: number; pageSize?: number; search?: string; status?: string }) {
    return this.courseService.getCoursesAdmin(data);
  }

  @MessagePattern('admin.getCourse')
  async getCourseAdmin(@Payload() data: { id: string }) {
    return this.courseService.getCourseAdmin(data.id);
  }

  @MessagePattern('admin.updateCourse')
  async updateCourseAdmin(@Payload() data: { id: string; updatedBy: string; [key: string]: any }) {
    try {
      const { id, updatedBy, ...updateData } = data;
      return await this.courseService.updateCourse(id, { ...updateData, updatedBy });
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw new RpcException({ statusCode: 404, message: error.message });
      }
      throw error;
    }
  }
}
