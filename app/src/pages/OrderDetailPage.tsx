import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate, useParams, Link } from "react-router-dom";

type OrderItem = {
  id: number;
  product_id: string;
  variant_id?: string | null;
  product_name: string;
  variant_name?: string | null;
  quantity: number;
  price: number;
  total: number;
};

type RefundLine = {
  id: number;
  product_id: string;
  variant_id?: string | null;
  qty: number;
  price: number;
  total: number;
};

type RefundPayment = {
  id: number;
  method: string;
  amount: number;
};

type Refund = {
  id: number;
  total_amount: number;
  return_to_inventory: boolean;
  notes?: string | null;
  created_at: string;
  user?: {
    id: number;
    name: string;
  };
  lines: RefundLine[];
  payments: RefundPayment[];
};

type Order = {
  id: number;
  order_number?: string;
  status?: string;
  total_amount?: number;
  refunded_total?: number;
  refund_status?: string;
  created_at?: string;
  items: OrderItem[];
};

const OrderDetailPage: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();

  const [order, setOrder] = useState<Order | null>(null);
  const [refunds, setRefunds] = useState<Refund[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orderId) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch order
        const orderRes = await axios.get(`/api/orders/${orderId}`);
        const orderData = orderRes.data.data || orderRes.data;

        // Ensure items exist in a consistent way
        const items: OrderItem[] =
          orderData.items ||
          orderData.lines ||
          [];

        setOrder({
          id: orderData.id,
          order_number: orderData.order_number || orderData.number || `#${orderData.id}`,
          status: orderData.status || "",
          total_amount: orderData.total_amount ?? 0,
          refunded_total: orderData.refunded_total ?? 0,
          refund_status: orderData.refund_status ?? "none",
          created_at: orderData.created_at,
          items,
        });

        // Fetch refunds for this order
        const refundsRes = await axios.get(`/api/orders/${orderId}/refunds`);
        const refundsData = refundsRes.data.data || refundsRes.data;
        setRefunds(refundsData);
      } catch (err: any) {
        console.error(err);
        setError(
          err.response?.data?.message ||
            "Failed to load order details. Please try again."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [orderId]);

  const handleRefundClick = () => {
    if (!orderId) return;
    navigate(`/orders/${orderId}/refund`);
  };

  if (loading) {
    return (
      <div className="page">
        <h1 className="page-title">Order Details</h1>
        <div className="card">Loading...</div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="page">
        <h1 className="page-title">Order Details</h1>
        <div className="card card-error">
          {error || "Order not found."}
        </div>
      </div>
    );
  }

  const refundableAmount =
    (order.total_amount || 0) - (order.refunded_total || 0);

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">
          Order {order.order_number || `#${order.id}`}
        </h1>
        <div className="page-header-actions">
          <button
            className="btn btn-primary"
            onClick={handleRefundClick}
            disabled={refundableAmount <= 0}
          >
            Refund
          </button>
        </div>
      </div>

      {/* Order summary */}
      <div className="card mb-3">
        <div className="card-header">Order Summary</div>
        <div className="card-body">
          <div className="summary-row">
            <span>Status:</span>
            <span>{order.status || "N/A"}</span>
          </div>
          <div className="summary-row">
            <span>Total:</span>
            <span>${(order.total_amount || 0).toFixed(2)}</span>
          </div>
          <div className="summary-row">
            <span>Refunded:</span>
            <span>${(order.refunded_total || 0).toFixed(2)}</span>
          </div>
          <div className="summary-row">
            <span>Refund status:</span>
            <span>{order.refund_status || "none"}</span>
          </div>
          <div className="summary-row">
            <span>Remaining refundable:</span>
            <span>${refundableAmount.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Items */}
      <div className="card mb-3">
        <div className="card-header">Items</div>
        <div className="card-body">
          {order.items.length === 0 ? (
            <div>No items found.</div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Variant</th>
                  <th className="text-right">Qty</th>
                  <th className="text-right">Price</th>
                  <th className="text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((item) => (
                  <tr key={item.id}>
                    <td>{item.product_name || item.product?.name || item.product_id}</td>
                    <td>
                      {item.variant_name ||
                        item.variant?.name ||
                        item.variant_id ||
                        "-"}
                    </td>
                    <td className="text-right">{item.quantity}</td>
                    <td className="text-right">
                      ${Number(item.price).toFixed(2)}
                    </td>
                    <td className="text-right">
                      ${Number(item.total || item.price * item.quantity).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Refunds history */}
      <div className="card">
        <div className="card-header">Refunds</div>
        <div className="card-body">
          {refunds.length === 0 ? (
            <div>No refunds yet.</div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Refund #</th>
                  <th>Date</th>
                  <th className="text-right">Amount</th>
                  <th>Inventory</th>
                  <th>By</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {refunds.map((refund) => (
                  <tr key={refund.id}>
                    <td>R-{refund.id}</td>
                    <td>
                      {new Date(refund.created_at).toLocaleString()}
                    </td>
                    <td className="text-right">
                      ${Number(refund.total_amount).toFixed(2)}
                    </td>
                    <td>
                      {refund.return_to_inventory
                        ? "Returned to inventory"
                        : "No stock return"}
                    </td>
                    <td>{refund.user?.name || "-"}</td>
                    <td>
                      <Link
                        to={`/refunds/${refund.id}`}
                        className="btn btn-sm btn-outline"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default OrderDetailPage;
