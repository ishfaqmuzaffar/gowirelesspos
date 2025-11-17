<?php
namespace App\Services;

use Exception;

class WooService {
  protected string $base;
  protected string $key;
  protected string $secret;

  public function __construct() {
    $this->base = rtrim(env('WOO_BASE_URL',''),'/');
    $this->key = env('WOO_CONSUMER_KEY','');
    $this->secret = env('WOO_CONSUMER_SECRET','');

    if (!$this->base || !$this->key || !$this->secret) {
      throw new Exception('WooCommerce not configured in .env');
    }
  }

  protected function request(string $method, string $path, array $query = [], array $body = null): array {
    $url = $this->base.'/wp-json/wc/v3/'.ltrim($path,'/');
    if (!empty($query)) {
      $url .= '?'.http_build_query($query);
    }

    $ch = curl_init($url);
    curl_setopt_array($ch, [
      CURLOPT_RETURNTRANSFER => true,
      CURLOPT_CUSTOMREQUEST  => strtoupper($method),
      CURLOPT_USERPWD        => $this->key.':'.$this->secret,
      CURLOPT_HTTPHEADER     => ['Content-Type: application/json'],
      CURLOPT_TIMEOUT        => 30,
    ]);

    if ($body !== null) {
      curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($body));
    }

    $resp = curl_exec($ch);
    if ($resp === false) {
      $err = curl_error($ch);
      curl_close($ch);
      throw new Exception('Woo request error: '.$err);
    }
    $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    $data = json_decode($resp,true);
    if ($status >= 400) {
      $msg = is_array($data) && isset($data['message']) ? $data['message'] : 'HTTP '.$status;
      throw new Exception('Woo HTTP '.$status.': '.$msg);
    }

    if (!is_array($data)) $data = [];
    return $data;
  }

  /** Fetch published products page by page */
  public function fetchProductsPage(int $page=1, int $perPage=50): array {
    return $this->request('GET','products',[
      'page'=>$page,
      'per_page'=>$perPage,
      'status'=>'publish',
    ]);
  }

  /** Fetch variations for a variable product */
  public function fetchVariations(int $productId, int $page=1, int $perPage=100): array {
    return $this->request('GET',"products/$productId/variations",[
      'page'=>$page,
      'per_page'=>$perPage,
    ]);
  }
}
