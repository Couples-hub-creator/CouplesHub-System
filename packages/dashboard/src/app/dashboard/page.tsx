import { redirect } from 'next/navigation';

/**
 * The dashboard entry point is the server picker.
 * /servers owns the session check and the real guild list.
 */
export default function DashboardIndex() {
  redirect('/servers');
}
