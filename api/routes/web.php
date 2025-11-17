<?php
use Illuminate\Support\Facades\Route;
Route::get('/', fn() => response('GoWireless POS API is running', 200)
  ->header('Content-Type', 'text/plain'));
