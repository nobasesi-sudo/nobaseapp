const APPS_SCRIPT_URL = process.env.NEXT_PUBLIC_APPS_SCRIPT_URL || '';

export async function sheetsApi(path: string, method: string = 'GET', data?: unknown, params?: Record<string, string>) {
  const url = new URL(APPS_SCRIPT_URL);
  url.searchParams.set('path', path);
  url.searchParams.set('method', method);

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
  }

  const options: RequestInit = {
    method: data ? 'POST' : 'GET',
    headers: {
      'Content-Type': 'text/plain',
    },
    redirect: 'follow',
  };

  if (data) {
    options.body = JSON.stringify(data);
  }

  try {
    const response = await fetch(url.toString(), options);
    const text = await response.text();

    try {
      return JSON.parse(text);
    } catch {
      console.error('Failed to parse response:', text.substring(0, 200));
      return null;
    }
  } catch (error) {
    console.error('Fetch error:', error);
    return null;
  }
}

// Products
export async function getProducts() {
  const result = await sheetsApi('products', 'GET');
  return Array.isArray(result) ? result : [];
}

export async function getProduct(id: string) {
  return sheetsApi(`products/${id}`, 'GET');
}

export async function createProduct(data: {
  name: string;
  price: number;
  unit: string;
  stock: number;
  comment?: string;
  image_url?: string;
  is_active?: boolean;
}) {
  return sheetsApi('products', 'POST', data);
}

export async function updateProduct(id: string, data: {
  name: string;
  price: number;
  unit: string;
  stock: number;
  comment?: string;
  image_url?: string;
  is_active?: boolean;
}) {
  return sheetsApi(`products/${id}`, 'PUT', data);
}

export async function patchProduct(id: string, data: Record<string, unknown>) {
  return sheetsApi(`products/${id}`, 'PATCH', data);
}

export async function deleteProduct(id: string) {
  return sheetsApi(`products/${id}`, 'DELETE');
}

export async function getProductHistory(name: string) {
  return sheetsApi('products/history', 'GET', undefined, { name });
}

// Orders
export async function getOrders(customerName?: string) {
  const result = await sheetsApi('orders', 'GET', undefined, customerName ? { customer_name: customerName } : undefined);
  return Array.isArray(result) ? result : [];
}

export async function getOrder(id: string) {
  return sheetsApi(`orders/${id}`, 'GET');
}

export async function createOrder(data: {
  customerName: string;
  items: Array<{
    product: {
      id: string;
      name: string;
      price: number;
      unit: string;
      stock: number;
    };
    quantity: number;
  }>;
}) {
  return sheetsApi('orders', 'POST', data);
}

export async function patchOrder(id: string, data: { status: string }) {
  return sheetsApi(`orders/${id}`, 'PATCH', data);
}

// Initialize sheets
export async function initSheets() {
  return sheetsApi('init', 'POST', {});
}
