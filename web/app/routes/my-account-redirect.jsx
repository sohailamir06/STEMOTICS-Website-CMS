import { redirect } from 'react-router';

// The old WooCommerce account URL (/my-account/) is permanently moved to /account/.
export function loader() {
  return redirect('/account/', 301);
}
