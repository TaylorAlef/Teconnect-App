revoke execute on function public.get_my_clock_state() from public, anon;
revoke execute on function public.get_company_attendance_live() from public, anon;
grant execute on function public.get_my_clock_state() to authenticated;
grant execute on function public.get_company_attendance_live() to authenticated;
