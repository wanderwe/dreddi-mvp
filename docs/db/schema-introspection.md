Columns:
table_name,column_name,data_type,is_nullable,column_default
profiles,id,uuid,NO,null
profiles,display_name,text,YES,null
profiles,handle,text,YES,null
profiles,avatar_url,text,YES,null
profiles,created_at,timestamp with time zone,YES,now()
profiles,email,text,YES,null
promises,id,uuid,NO,gen_random_uuid()
promises,creator_id,uuid,NO,null
promises,title,text,NO,null
promises,details,text,YES,null
promises,counterparty_contact,text,YES,null
promises,due_at,timestamp with time zone,YES,null
promises,status,text,NO,'active'::text
promises,created_at,timestamp with time zone,YES,now()
promises,invite_token,text,YES,null
promises,counterparty_id,uuid,YES,null
promises,counterparty_accepted_at,timestamp with time zone,YES,null
promises,promisor_claim,text,NO,'active'::text
promises,promisee_claim,text,NO,'pending'::text
promises,promisor_id,uuid,YES,null
promises,promisee_id,uuid,YES,null
promises,completed_at,timestamp with time zone,YES,null
promises,confirmed_at,timestamp with time zone,YES,null
promises,disputed_at,timestamp with time zone,YES,null
promises,dispute_reason,text,YES,null
promises,disputed_code,text,YES,null
reputation_events,id,uuid,NO,gen_random_uuid()
reputation_events,user_id,uuid,NO,null
reputation_events,promise_id,uuid,NO,null
reputation_events,kind,text,NO,null
reputation_events,delta,integer,NO,null
reputation_events,meta,jsonb,NO,'{}'::jsonb
reputation_events,created_at,timestamp with time zone,NO,now()
user_reputation,user_id,uuid,NO,null
user_reputation,score,integer,NO,50
user_reputation,confirmed_count,integer,NO,0
user_reputation,disputed_count,integer,NO,0
user_reputation,on_time_count,integer,NO,0
user_reputation,total_promises_completed,integer,NO,0
user_reputation,updated_at,timestamp with time zone,NO,now()

Foreign keys:
table_name,column_name,foreign_table_name,foreign_column_name
promises,creator_id,profiles,id
promises,counterparty_id,profiles,id
reputation_events,promise_id,promises,id

Indexes:
tablename,indexname,indexdef
profiles,profiles_handle_key,CREATE UNIQUE INDEX profiles_handle_key ON public.profiles USING btree (handle)
profiles,profiles_pkey,CREATE UNIQUE INDEX profiles_pkey ON public.profiles USING btree (id)
promises,promises_invite_token_unique,CREATE UNIQUE INDEX promises_invite_token_unique ON public.promises USING btree (invite_token) WHERE (invite_token IS NOT NULL)
promises,promises_pkey,CREATE UNIQUE INDEX promises_pkey ON public.promises USING btree (id)
reputation_events,reputation_events_pkey,CREATE UNIQUE INDEX reputation_events_pkey ON public.reputation_events USING btree (id)
reputation_events,reputation_events_promise_idx,CREATE INDEX reputation_events_promise_idx ON public.reputation_events USING btree (promise_id)
reputation_events,reputation_events_user_id_promise_id_kind_key,"CREATE UNIQUE INDEX reputation_events_user_id_promise_id_kind_key ON public.reputation_events USING btree (user_id, promise_id, kind)"
reputation_events,reputation_events_user_idx,CREATE INDEX reputation_events_user_idx ON public.reputation_events USING btree (user_id)
user_reputation,user_reputation_pkey,CREATE UNIQUE INDEX user_reputation_pkey ON public.user_reputation USING btree (user_id)

Note:
- promises.status is TEXT (not ENUM)
- lifecycle is enforced at application level