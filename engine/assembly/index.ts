// Cosmic Physics Engine — entry point
// Re-exports all modules for unified physics.wasm

// Shared utilities
export {
  soaAlloc,
  rawAlloc,
  resetAlloc,
  getMaxN
} from "./shared/memory";

export {
  spatial_init,
  spatial_build,
  spatial_query,
  spatial_get_results_ptr,
  spatial_get_result_count
} from "./shared/spatial";

// N-body gravity
export {
  nbody_init,
  nbody_set_params,
  nbody_set_speed_clamp,
  nbody_set_attractor_softening,
  nbody_add,
  nbody_remove,
  nbody_step,
  nbody_add_attractor,
  nbody_update_attractor,
  nbody_remove_attractor,
  nbody_clear_attractors,
  nbody_get_attractor_count,
  nbody_get_count,
  nbody_get_px_ptr,
  nbody_get_py_ptr,
  nbody_get_vx_ptr,
  nbody_get_vy_ptr,
  nbody_get_mass_ptr,
  nbody_get_state_ptr,
  nbody_get_max
} from "./nbody";

// Boid flocking
export {
  boids_init,
  boids_set_params,
  boids_add,
  boids_set_attractor,
  boids_step,
  boids_get_count,
  boids_get_px_ptr,
  boids_get_py_ptr,
  boids_get_vx_ptr,
  boids_get_vy_ptr,
  boids_get_type_ptr,
  boids_get_max
} from "./boids";

// Cellular automata
export {
  cellular_init,
  cellular_set,
  cellular_get,
  cellular_step,
  cellular_add_ant,
  cellular_get_grid_ptr,
  cellular_get_glow_ptr,
  cellular_get_age_ptr,
  cellular_get_width,
  cellular_get_height,
  cellular_clear
} from "./cellular";

// Reaction-diffusion
export {
  reaction_init,
  reaction_set_params,
  reaction_seed,
  reaction_step,
  reaction_get_a_ptr,
  reaction_get_b_ptr,
  reaction_get_width,
  reaction_get_height
} from "./reaction";

// Wave equation
export {
  wave_init,
  wave_add_source,
  wave_remove_source,
  wave_set_wall,
  wave_step,
  wave_get_field_ptr,
  wave_get_walls_ptr,
  wave_get_cols,
  wave_get_rows,
  wave_clear
} from "./wave";

// Discrete Fourier Transform
export {
  dft_init,
  dft_forward,
  dft_inverse,
  dft_get_buffer_ptr
} from "./dft";
