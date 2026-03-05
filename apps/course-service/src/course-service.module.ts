import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { getEnvFilePath } from '@app/shared';
import { CourseService } from './service/course.service';
import { CourseRatingService } from './service/course-rating.service';
import { CourseServiceController } from './controller/course-service.controller';
import { DatabaseModule } from '@app/database';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true, envFilePath: getEnvFilePath() }), DatabaseModule],
  controllers: [CourseServiceController],
  providers: [CourseService, CourseRatingService],
})
export class CourseServiceModule { }
