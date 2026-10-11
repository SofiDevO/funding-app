import React, { useRef, useState } from 'react';
// Import Swiper React components
import { Swiper, SwiperSlide } from 'swiper/react';

// Import Swiper styles
import 'swiper/css';
import 'swiper/css/effect-coverflow';
import 'swiper/css/pagination';

import './swiper-carousel.css';

// import required modules
import { EffectCoverflow, Pagination } from 'swiper/modules';

interface Props {
  gallery: string[];
}

export default function SwiperCarousel({ gallery }: Props) {
  return (
    <>
      <Swiper
        effect={'coverflow'}
        grabCursor={true}
        centeredSlides={true}
        slidesPerView={'auto'}
        coverflowEffect={{
          rotate: 50,
          stretch: 0,
          depth: 100,
          modifier: 1,
          slideShadows: true,
        }}
        pagination={true}
        modules={[EffectCoverflow, Pagination]}
        className="mySwiper"
      >
        {gallery.map((image) => (
          <SwiperSlide key={image}>
            <img src={image} alt="Product Gallery" />
          </SwiperSlide>
        ))}
      </Swiper>
    </>
  );
}
