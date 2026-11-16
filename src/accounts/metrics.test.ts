import { it, expect, vi } from 'vitest';
import { metricPoint, emitMetric, costEstimate } from './metrics';
import type { AccountEnv } from './types';
import type { ChatMetadata } from '../coach-chat/types';
const metadata: ChatMetadata={templateId:'mentor-skills',promptVersion:'ignored',retrievalVersion:'ignored',resourceIds:[],model:'@cf/meta/test',attempts:1,latencyMs:200,tokens:100,usageComplete:true,outcome:'ai',errorCategory:null,attemptDetails:[{slot:0,model:'@cf/meta/test',executed:true,latencyMs:200,tokens:100,inputTokens:80,outputTokens:20,error:null}]};
it('never serializes unknown/private fields or unchecked error/model strings',()=>{
 const privateText='secret person@example.com Bearer-token';
 const point=metricPoint({} as AccountEnv,'interaction',{...metadata,model:privateText,answer:privateText,promptVersion:privateText} as any,{category:privateText,rating:privateText,raw:privateText} as any);
 expect(JSON.stringify(point)).not.toContain(privateText);expect(JSON.stringify(point)).not.toContain('person@example.com');expect(point.blobs).toContain('storage_or_security');
 expect(point.indexes).toEqual(['fde-coach-v1']);
});
it('uses null/negative sentinels for unavailable cost/tokens rather than reporting zero',()=>{
 expect(costEstimate({},metadata)).toBeNull();
 expect(metricPoint({},'interaction',{...metadata,tokens:null,usageComplete:false}).doubles[2]).toBe(-1);
});
it('estimates from configured rates and labels total-only data conservatively',()=>{
 const env={COACH_MODEL_PRICES_JSON:JSON.stringify({'@cf/meta/test':{inputPerMillion:1,outputPerMillion:4}})};
 expect(costEstimate(env,metadata)).toBeCloseTo(.00016);
 expect(costEstimate(env,{...metadata,attemptDetails:[{...metadata.attemptDetails![0],inputTokens:null,outputTokens:null}]})).toBeCloseTo(.0004);
 expect(costEstimate(env,{...metadata,usageComplete:false})).toBeNull();
 expect(costEstimate({COACH_MODEL_PRICES_JSON:'broken'},metadata)).toBeNull();
});
it('counts actual primary/fallback calls separately from rejected admission',()=>{
 const point=metricPoint({},'interaction',{...metadata,attemptDetails:[metadata.attemptDetails![0],{...metadata.attemptDetails![0],slot:1,executed:false}]});
 expect(point.doubles.slice(5,7)).toEqual([1,0]);
});
it('is disabled by default and never breaks coaching when the metrics binding fails',()=>{
 const writeDataPoint=vi.fn(()=>{throw new Error('private diagnostic')});
 emitMetric({COACH_METRICS:{writeDataPoint}},'interaction',metadata);expect(writeDataPoint).not.toHaveBeenCalled();
 expect(()=>emitMetric({FDE_COACH_METRICS_ENABLED:'true',COACH_METRICS:{writeDataPoint}},'interaction',metadata)).not.toThrow();
 expect(writeDataPoint).toHaveBeenCalledTimes(1);
});
