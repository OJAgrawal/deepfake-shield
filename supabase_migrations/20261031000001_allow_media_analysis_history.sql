alter table public.analysis_history
    drop constraint if exists analysis_history_analysis_type_check;

alter table public.analysis_history
    add constraint analysis_history_analysis_type_check
    check (analysis_type in ('image', 'text', 'audio', 'video'));
