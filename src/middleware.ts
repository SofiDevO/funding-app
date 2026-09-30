import {defineMiddleware} from 'astro/middleware';

export const onRequest = defineMiddleware(async (c, next)=>{

    await next();
})